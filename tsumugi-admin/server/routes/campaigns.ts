import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { campaigns, coupons, emailSends, customers } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sendBulkMarketingEmails } from '../lib/email.js';

export const campaignsRouter = Router();

function verifyInternalKey(req: Request, res: Response, next: NextFunction): void {
  const internalKey = process.env.INTERNAL_API_KEY;
  const provided = req.headers['x-internal-key'];

  if (!internalKey || typeof provided !== 'string') {
    res.status(401).json({ valid: false, error: 'Unauthorized' });
    return;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(internalKey);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ valid: false, error: 'Unauthorized' });
    return;
  }

  next();
}

// Internal coupon validation endpoint (called by tsumugi server, not admin UI)
// This only validates -- does NOT increment usage. Usage is incremented via /coupons/use after payment.
campaignsRouter.post('/coupons/validate', verifyInternalKey, (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({ valid: false, error: 'クーポンコードを入力してください' });
      return;
    }

    const coupon = db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase())).get();

    if (!coupon) {
      res.json({ valid: false, error: '無効なクーポンコードです' });
      return;
    }

    if (!coupon.isActive) {
      res.json({ valid: false, error: 'このクーポンは無効化されています' });
      return;
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.json({ valid: false, error: 'このクーポンは有効期限が切れています' });
      return;
    }

    if (coupon.maxUses && (coupon.currentUses ?? 0) >= coupon.maxUses) {
      res.json({ valid: false, error: 'このクーポンの利用上限に達しています' });
      return;
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ valid: false, error: 'クーポンの検証に失敗しました' });
  }
});

// Internal coupon usage endpoint -- called after payment completes. Atomic increment.
campaignsRouter.post('/coupons/use', verifyInternalKey, (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({ success: false });
      return;
    }

    // Atomic increment with max_uses check in a single SQL statement
    const result = db.run(
      `UPDATE coupons SET current_uses = current_uses + 1
       WHERE code = ? AND is_active = 1
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      code.trim().toUpperCase(),
    );

    res.json({ success: result.changes > 0 });
  } catch (error) {
    console.error('Use coupon error:', error);
    res.status(500).json({ success: false });
  }
});

campaignsRouter.use(requireAuth);

// GET /api/campaigns — list campaigns with pagination
campaignsRouter.get('/', (req, res) => {
  try {
    const { limit: limitParam, offset: offsetParam } = req.query as { limit?: string; offset?: string };
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    const results = db.select().from(campaigns).limit(limit).offset(offset).all();
    res.json({ campaigns: results, limit, offset });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// POST /api/campaigns — create a new campaign
campaignsRouter.post('/', (req, res) => {
  try {
    const { name, type, description, startDate, endDate } = req.body as {
      name: string;
      type: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    };

    if (!name?.trim() || !type?.trim()) {
      res.status(400).json({ error: 'name and type are required' });
      return;
    }

    const validTypes = ['email', 'coupon', 'sns', 'ab_test'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const now = new Date().toISOString();
    const campaign = {
      id: nanoid(),
      name: name.trim(),
      type,
      status: 'draft',
      description: description?.trim() || null,
      config: null,
      startDate: startDate || null,
      endDate: endDate || null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(campaigns).values(campaign).run();
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id — update campaign
campaignsRouter.put('/:id', (req, res) => {
  try {
    const existing = db.select().from(campaigns).where(eq(campaigns.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const { name, status, description, startDate, endDate } = req.body as {
      name?: string;
      status?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    };

    const validStatuses = ['draft', 'scheduled', 'active', 'completed'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    db.update(campaigns)
      .set({
        ...(name && { name: name.trim() }),
        ...(status && { status }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(campaigns.id, req.params.id))
      .run();

    const updated = db.select().from(campaigns).where(eq(campaigns.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id
campaignsRouter.delete('/:id', (req, res) => {
  try {
    const existing = db.select().from(campaigns).where(eq(campaigns.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Delete associated records in a transaction to avoid FK constraint violations
    db.transaction((tx) => {
      tx.delete(emailSends).where(eq(emailSends.campaignId, req.params.id)).run();
      tx.delete(coupons).where(eq(coupons.campaignId, req.params.id)).run();
      tx.delete(campaigns).where(eq(campaigns.id, req.params.id)).run();
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// POST /api/campaigns/:id/send-email — send email to customer segment
campaignsRouter.post('/:id/send-email', async (req, res) => {
  try {
    const campaign = db.select().from(campaigns).where(eq(campaigns.id, req.params.id)).get();
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const { subject, htmlBody, segment } = req.body as {
      subject: string;
      htmlBody: string;
      segment?: string;
    };

    if (!subject?.trim() || !htmlBody?.trim()) {
      res.status(400).json({ error: 'subject and htmlBody are required' });
      return;
    }

    // Get recipients based on segment filter
    let recipients;
    if (segment && ['new', 'active', 'lapsed'].includes(segment)) {
      recipients = db.select().from(customers).where(eq(customers.segment, segment)).all();
    } else {
      recipients = db.select().from(customers).all();
    }

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No recipients found for this segment' });
      return;
    }

    const now = new Date().toISOString();
    const emails = recipients.map((r) => r.email);

    const result = await sendBulkMarketingEmails(emails, subject.trim(), htmlBody.trim());

    // Record email sends in DB
    for (const email of emails) {
      db.insert(emailSends).values({
        id: nanoid(),
        campaignId: campaign.id,
        recipientEmail: email,
        subject: subject.trim(),
        status: result.errors.some((e) => e.startsWith(`${email}:`)) ? 'failed' : 'sent',
        sentAt: now,
      }).run();
    }

    // Update campaign status
    db.update(campaigns)
      .set({ status: 'active', updatedAt: now })
      .where(eq(campaigns.id, campaign.id))
      .run();

    res.json({ success: true, sent: result.sent, failed: result.failed, total: recipients.length });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

// --- Coupon endpoints ---

// GET /api/campaigns/coupons — list all coupons
campaignsRouter.get('/coupons/list', (req, res) => {
  try {
    const { limit: limitParam, offset: offsetParam } = req.query as { limit?: string; offset?: string };
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    const totalRow = db.get<{ total: number }>(sql`SELECT COUNT(*) as total FROM coupons`);
    const total = Number(totalRow?.total ?? 0);
    const results = db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    res.json({
      coupons: results,
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    });
  } catch (error) {
    console.error('List coupons error:', error);
    res.status(500).json({ error: 'Failed to list coupons' });
  }
});

// POST /api/campaigns/coupons — create a coupon
campaignsRouter.post('/coupons', (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, campaignId, expiresAt } = req.body as {
      code?: string;
      discountType: string;
      discountValue: number;
      maxUses?: number;
      campaignId?: string;
      expiresAt?: string;
    };

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      res.status(400).json({ error: 'discountType must be percentage or fixed' });
      return;
    }

    if (typeof discountValue !== 'number' || discountValue <= 0) {
      res.status(400).json({ error: 'discountValue must be a positive number' });
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      res.status(400).json({ error: 'percentage discount cannot exceed 100%' });
      return;
    }

    const couponCode = code?.trim().toUpperCase() || `TSUMUGI-${randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const coupon = {
      id: nanoid(),
      code: couponCode,
      discountType,
      discountValue,
      maxUses: maxUses || null,
      currentUses: 0,
      campaignId: campaignId || null,
      expiresAt: expiresAt || null,
      createdAt: now,
      isActive: true,
    };

    db.insert(coupons).values(coupon).run();
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// PUT /api/campaigns/coupons/:id — toggle coupon active status
campaignsRouter.put('/coupons/:id', (req, res) => {
  try {
    const existing = db.select().from(coupons).where(eq(coupons.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    const { isActive } = req.body as { isActive?: boolean };
    if (isActive !== undefined) {
      db.update(coupons)
        .set({ isActive })
        .where(eq(coupons.id, req.params.id))
        .run();
    }

    const updated = db.select().from(coupons).where(eq(coupons.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});
