import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { campaigns, coupons, emailSends, customers } from '../db/schema.js';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sendBulkMarketingEmails } from '../lib/email.js';
import { verifyUnsubscribeToken } from '../lib/unsubscribe.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { config } from '../config.js';

export const campaignsRouter = Router();
const internalCouponValidateLimiter = createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'campaign-coupon-validate' });
const internalCouponUseLimiter = createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'campaign-coupon-use' });
const MIN_INTERNAL_KEY_LENGTH = 16;
const MAX_INTERNAL_KEY_HEADER_LENGTH = 256;

function isDuplicateCouponCodeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const sqliteErrorCode = (error as Error & { code?: string }).code;
  if (sqliteErrorCode && sqliteErrorCode !== 'SQLITE_CONSTRAINT' && sqliteErrorCode !== 'SQLITE_CONSTRAINT_UNIQUE') {
    return false;
  }
  return /UNIQUE constraint failed:\s*coupons\.code/i.test(error.message);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readStringField(body: unknown, key: string): string {
  if (!body || typeof body !== 'object') return '';
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function verifyInternalKey(req: Request, res: Response, next: NextFunction): void {
  const internalKey = config.INTERNAL_API_KEY;
  const provided = req.headers['x-internal-key'];

  if (!internalKey || internalKey.length < MIN_INTERNAL_KEY_LENGTH) {
    res.status(503).json({ valid: false, error: 'Internal API key is not configured securely' });
    return;
  }

  if (typeof provided !== 'string' || provided.length === 0 || provided.length > MAX_INTERNAL_KEY_HEADER_LENGTH) {
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

function renderUnsubscribeHtml(params: {
  message: string;
  confirmToken?: { email: string; expires: string; sig: string };
}): string {
  const { message, confirmToken } = params;
  const confirmationBlock = confirmToken
    ? `<form method="post" action="/api/campaigns/unsubscribe" style="margin-top:18px;">
          <input type="hidden" name="email" value="${escapeHtml(confirmToken.email)}" />
          <input type="hidden" name="expires" value="${escapeHtml(confirmToken.expires)}" />
          <input type="hidden" name="sig" value="${escapeHtml(confirmToken.sig)}" />
          <button type="submit" style="border:0;border-radius:10px;background:#8b6914;color:#fff;padding:10px 18px;font-size:14px;cursor:pointer;">
            配信停止を確定する
          </button>
        </form>`
    : '';

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>配信設定 | TSUMUGI</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif; background: #faf8f5; color: #2c2418; }
      .wrap { max-width: 560px; margin: 56px auto; padding: 0 16px; }
      .card { background: #fff; border: 1px solid #e8e0d4; border-radius: 16px; padding: 28px 24px; }
      h1 { margin: 0 0 12px; font-size: 20px; }
      p { margin: 0; line-height: 1.7; color: #5a5148; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>メール配信設定</h1>
        <p>${escapeHtml(message)}</p>
        ${confirmationBlock}
      </div>
    </div>
  </body>
</html>`;
}

function unsubscribeByEmail(email: string): number {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  const now = new Date().toISOString();
  const result = db.run(sql`
    UPDATE customers
    SET marketing_opt_out_at = COALESCE(marketing_opt_out_at, ${now})
    WHERE lower(email) = ${normalized}
  `);
  return result.changes;
}

// Internal coupon validation endpoint (called by tsumugi server, not admin UI)
// This only validates -- does NOT increment usage. Usage is incremented via /coupons/use after payment.
campaignsRouter.post('/coupons/validate', internalCouponValidateLimiter, verifyInternalKey, (req, res) => {
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
campaignsRouter.post('/coupons/use', internalCouponUseLimiter, verifyInternalKey, (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({ success: false });
      return;
    }

    // Atomic increment with max_uses check in a single SQL statement
    const normalizedCode = code.trim().toUpperCase();
    const result = db.run(sql`
      UPDATE coupons
      SET current_uses = current_uses + 1
      WHERE code = ${normalizedCode}
        AND is_active = 1
        AND (max_uses IS NULL OR current_uses < max_uses)
    `);

    res.json({ success: result.changes > 0 });
  } catch (error) {
    console.error('Use coupon error:', error);
    res.status(500).json({ success: false });
  }
});

// Public unsubscribe endpoint for marketing emails
campaignsRouter.get('/unsubscribe', (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  const expires = typeof req.query.expires === 'string' ? req.query.expires : '';
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';

  if (!verifyUnsubscribeToken({ email, expires, sig })) {
    res
      .status(400)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(renderUnsubscribeHtml({ message: '配信停止リンクが無効か期限切れです。' }));
    return;
  }

  res
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(renderUnsubscribeHtml({
      message: '下のボタンを押すと、今後のマーケティングメール配信を停止します。',
      confirmToken: { email, expires, sig },
    }));
});

campaignsRouter.post('/unsubscribe', (req, res) => {
  const normalizedEmail = readStringField(req.body, 'email');
  const normalizedExpires = readStringField(req.body, 'expires');
  const normalizedSig = readStringField(req.body, 'sig');
  const isFormSubmission = Boolean(req.is('application/x-www-form-urlencoded'));

  if (!verifyUnsubscribeToken({ email: normalizedEmail, expires: normalizedExpires, sig: normalizedSig })) {
    if (isFormSubmission) {
      res
        .status(400)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(renderUnsubscribeHtml({ message: '配信停止リンクが無効か期限切れです。' }));
      return;
    }
    res.status(400).json({ success: false, error: 'Invalid unsubscribe token' });
    return;
  }

  const updated = unsubscribeByEmail(normalizedEmail);
  if (isFormSubmission) {
    res
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(renderUnsubscribeHtml({ message: '今後のマーケティングメール配信を停止しました。' }));
    return;
  }
  res.json({ success: true, updated });
});

campaignsRouter.use(requireAuth);

// GET /api/campaigns — list campaigns with pagination
campaignsRouter.get('/', (req, res) => {
  try {
    const { limit: limitParam, offset: offsetParam } = req.query as { limit?: string; offset?: string };
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
    const offset = Math.max(Number(offsetParam) || 0, 0);
    const totalRow = db.get<{ total: number }>(sql`SELECT COUNT(*) as total FROM campaigns`);
    const total = Number(totalRow?.total ?? 0);

    const results = db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
      .limit(limit)
      .offset(offset)
      .all();
    const nextOffset = offset + results.length;
    res.json({
      campaigns: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: nextOffset < total,
        nextOffset: nextOffset < total ? nextOffset : null,
      },
    });
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
      recipients = db
        .select()
        .from(customers)
        .where(and(eq(customers.segment, segment), isNull(customers.marketingOptOutAt)))
        .all();
    } else {
      recipients = db.select().from(customers).where(isNull(customers.marketingOptOutAt)).all();
    }

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No recipients found for this segment' });
      return;
    }

    const now = new Date().toISOString();
    const emails = recipients.map((r) => r.email);

    const result = await sendBulkMarketingEmails(emails, subject.trim(), htmlBody.trim());

    const failedRecipients = new Set<string>();
    for (const errorMessage of result.errors) {
      const separatorIndex = errorMessage.indexOf(':');
      if (separatorIndex <= 0) continue;
      failedRecipients.add(errorMessage.slice(0, separatorIndex).trim().toLowerCase());
    }

    // Persist send logs and campaign status atomically.
    db.transaction((tx) => {
      for (const email of emails) {
        const normalizedEmail = email.trim().toLowerCase();
        tx.insert(emailSends).values({
          id: nanoid(),
          campaignId: campaign.id,
          recipientEmail: email,
          subject: subject.trim(),
          status: failedRecipients.has(normalizedEmail) ? 'failed' : 'sent',
          sentAt: now,
        }).run();
      }

      tx.update(campaigns)
        .set({ status: 'active', updatedAt: now })
        .where(eq(campaigns.id, campaign.id))
        .run();
    });

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

    if (typeof discountValue !== 'number' || !Number.isFinite(discountValue) || discountValue <= 0) {
      res.status(400).json({ error: 'discountValue must be a positive number' });
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      res.status(400).json({ error: 'percentage discount cannot exceed 100%' });
      return;
    }

    const normalizedMaxUses = maxUses === undefined ? undefined : Number(maxUses);
    if (
      normalizedMaxUses !== undefined &&
      (!Number.isInteger(normalizedMaxUses) || normalizedMaxUses < 1)
    ) {
      res.status(400).json({ error: 'maxUses must be a positive integer' });
      return;
    }

    const couponCode = code?.trim().toUpperCase() || `TSUMUGI-${randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const coupon = {
      id: nanoid(),
      code: couponCode,
      discountType,
      discountValue,
      maxUses: normalizedMaxUses ?? null,
      currentUses: 0,
      campaignId: campaignId || null,
      expiresAt: expiresAt || null,
      createdAt: now,
      isActive: true,
    };

    db.insert(coupons).values(coupon).run();
    res.status(201).json(coupon);
  } catch (error) {
    if (isDuplicateCouponCodeError(error)) {
      res.status(409).json({ error: 'Coupon code already exists' });
      return;
    }
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
