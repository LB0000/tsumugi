import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { funnelSnapshots } from '../db/schema.js';
import { eq, gte, lte, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const funnelRouter = Router();
funnelRouter.use(requireAuth);

funnelRouter.get('/snapshots', (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const conditions = [];
    if (startDate?.trim()) conditions.push(gte(funnelSnapshots.date, startDate.trim()));
    if (endDate?.trim()) conditions.push(lte(funnelSnapshots.date, endDate.trim()));

    const snapshots = conditions.length > 0
      ? db.select().from(funnelSnapshots).where(and(...conditions)).all()
      : db.select().from(funnelSnapshots).all();

    const totalVisitors = snapshots.reduce((sum, s) => sum + (s.visitors ?? 0), 0);
    const totalFree = snapshots.reduce((sum, s) => sum + (s.freeGenerations ?? 0), 0);
    const totalCharges = snapshots.reduce((sum, s) => sum + (s.charges ?? 0), 0);
    const totalPurchases = snapshots.reduce((sum, s) => sum + (s.physicalPurchases ?? 0), 0);

    const conversionRates = {
      visitToFree: totalVisitors > 0 ? Math.round((totalFree / totalVisitors) * 10000) / 100 : 0,
      freeToCharge: totalFree > 0 ? Math.round((totalCharges / totalFree) * 10000) / 100 : 0,
      chargeToPurchase: totalCharges > 0 ? Math.round((totalPurchases / totalCharges) * 10000) / 100 : 0,
      visitToPurchase: totalVisitors > 0 ? Math.round((totalPurchases / totalVisitors) * 10000) / 100 : 0,
    };

    res.json({ snapshots, conversionRates });
  } catch (error) {
    console.error('List funnel snapshots error:', error);
    res.status(500).json({ error: 'Failed to list funnel snapshots' });
  }
});

funnelRouter.post('/snapshots', (req, res) => {
  try {
    const { date, visitors, freeGenerations, charges, physicalPurchases, revenue } = req.body as {
      date?: string; visitors?: number; freeGenerations?: number;
      charges?: number; physicalPurchases?: number; revenue?: number;
    };

    if (!date?.trim()) { res.status(400).json({ error: 'date is required' }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { res.status(400).json({ error: 'date must be YYYY-MM-DD format' }); return; }

    const numericFields = { visitors, freeGenerations, charges, physicalPurchases, revenue };
    for (const [key, val] of Object.entries(numericFields)) {
      if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val))) {
        res.status(400).json({ error: `${key} must be a finite number` }); return;
      }
    }

    const existing = db.select().from(funnelSnapshots).where(eq(funnelSnapshots.date, date.trim())).get();

    if (existing) {
      db.update(funnelSnapshots)
        .set({
          ...(visitors !== undefined && { visitors }),
          ...(freeGenerations !== undefined && { freeGenerations }),
          ...(charges !== undefined && { charges }),
          ...(physicalPurchases !== undefined && { physicalPurchases }),
          ...(revenue !== undefined && { revenue }),
        })
        .where(eq(funnelSnapshots.date, date.trim()))
        .run();
      const updated = db.select().from(funnelSnapshots).where(eq(funnelSnapshots.date, date.trim())).get();
      res.json(updated);
    } else {
      const snapshot = {
        id: nanoid(),
        date: date.trim(),
        visitors: visitors ?? 0,
        freeGenerations: freeGenerations ?? 0,
        charges: charges ?? 0,
        physicalPurchases: physicalPurchases ?? 0,
        revenue: revenue ?? 0,
        createdAt: new Date().toISOString(),
      };
      db.insert(funnelSnapshots).values(snapshot).run();
      res.status(201).json(snapshot);
    }
  } catch (error) {
    console.error('Upsert funnel snapshot error:', error);
    res.status(500).json({ error: 'Failed to upsert funnel snapshot' });
  }
});
