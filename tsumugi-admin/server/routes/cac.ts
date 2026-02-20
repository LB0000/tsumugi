import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { adSpends } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const cacRouter = Router();
cacRouter.use(requireAuth);

cacRouter.get('/spends', (req, res) => {
  try {
    const { period } = req.query as { period?: string };
    const spends = period?.trim()
      ? db.select().from(adSpends).where(eq(adSpends.period, period.trim())).all()
      : db.select().from(adSpends).all();

    const totalSpend = spends.reduce((sum, s) => sum + s.amount, 0);
    const totalConversions = spends.reduce((sum, s) => sum + (s.conversions ?? 0), 0);
    const totalRevenue = spends.reduce((sum, s) => sum + (s.revenue ?? 0), 0);
    const avgCac = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0;
    const roas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;

    res.json({ spends, summary: { totalSpend, totalConversions, avgCac, totalRevenue, roas } });
  } catch (error) {
    console.error('List ad spends error:', error);
    res.status(500).json({ error: 'Failed to list ad spends' });
  }
});

cacRouter.post('/spends', (req, res) => {
  try {
    const { channel, amount, period, impressions, clicks, conversions, revenue, note } = req.body as {
      channel?: string; amount?: number; period?: string;
      impressions?: number; clicks?: number; conversions?: number; revenue?: number; note?: string;
    };

    if (!channel?.trim()) { res.status(400).json({ error: 'channel is required' }); return; }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) { res.status(400).json({ error: 'amount must be a number' }); return; }
    if (!period?.trim()) { res.status(400).json({ error: 'period is required' }); return; }

    const spend = {
      id: nanoid(),
      channel: channel.trim(),
      amount,
      period: period.trim(),
      impressions: impressions ?? 0,
      clicks: clicks ?? 0,
      conversions: conversions ?? 0,
      revenue: revenue ?? 0,
      note: note?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    db.insert(adSpends).values(spend).run();
    res.status(201).json(spend);
  } catch (error) {
    console.error('Create ad spend error:', error);
    res.status(500).json({ error: 'Failed to create ad spend' });
  }
});

cacRouter.put('/spends/:id', (req, res) => {
  try {
    const existing = db.select().from(adSpends).where(eq(adSpends.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Ad spend not found' }); return; }

    const { channel, amount, period, impressions, clicks, conversions, revenue, note } = req.body as {
      channel?: string; amount?: number; period?: string;
      impressions?: number; clicks?: number; conversions?: number; revenue?: number; note?: string;
    };

    const numericFields = { amount, impressions, clicks, conversions, revenue };
    for (const [key, val] of Object.entries(numericFields)) {
      if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val))) {
        res.status(400).json({ error: `${key} must be a finite number` }); return;
      }
    }

    db.update(adSpends)
      .set({
        ...(channel !== undefined && { channel: channel.trim() }),
        ...(amount !== undefined && { amount }),
        ...(period !== undefined && { period: period.trim() }),
        ...(impressions !== undefined && { impressions }),
        ...(clicks !== undefined && { clicks }),
        ...(conversions !== undefined && { conversions }),
        ...(revenue !== undefined && { revenue }),
        ...(note !== undefined && { note: note?.trim() || null }),
      })
      .where(eq(adSpends.id, req.params.id))
      .run();

    const updated = db.select().from(adSpends).where(eq(adSpends.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update ad spend error:', error);
    res.status(500).json({ error: 'Failed to update ad spend' });
  }
});

cacRouter.delete('/spends/:id', (req, res) => {
  try {
    const existing = db.select().from(adSpends).where(eq(adSpends.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Ad spend not found' }); return; }
    db.delete(adSpends).where(eq(adSpends.id, req.params.id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete ad spend error:', error);
    res.status(500).json({ error: 'Failed to delete ad spend' });
  }
});
