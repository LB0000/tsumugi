import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { fetchAnalytics } from '../lib/square-analytics.js';
import { db } from '../db/index.js';
import { analyticsSnapshots } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 365;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

analyticsRouter.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (startDate && !isValidDate(startDate)) {
      res.status(400).json({ error: 'startDate must be YYYY-MM-DD format' });
      return;
    }
    if (endDate && !isValidDate(endDate)) {
      res.status(400).json({ error: 'endDate must be YYYY-MM-DD format' });
      return;
    }

    const end = endDate || new Date().toISOString().slice(0, 10);
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();

    if (start > end) {
      res.status(400).json({ error: 'startDate must be before endDate' });
      return;
    }

    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_RANGE_DAYS) {
      res.status(400).json({ error: `Date range must be ${MAX_RANGE_DAYS} days or less` });
      return;
    }

    const { data, source } = await fetchAnalytics(start, end);

    // Only cache live data snapshots
    if (source === 'live') {
      for (const day of data) {
        const existing = db.select().from(analyticsSnapshots).where(eq(analyticsSnapshots.date, day.date)).get();
        if (!existing) {
          db.insert(analyticsSnapshots).values({
            id: nanoid(),
            date: day.date,
            totalOrders: day.totalOrders,
            totalRevenue: day.totalRevenue,
            uniqueCustomers: day.uniqueCustomers,
            avgOrderValue: day.avgOrderValue,
            productBreakdown: JSON.stringify(day.productBreakdown),
            createdAt: new Date().toISOString(),
          }).run();
        }
      }
    }

    const totals = data.reduce(
      (acc, day) => ({
        totalOrders: acc.totalOrders + day.totalOrders,
        totalRevenue: acc.totalRevenue + day.totalRevenue,
        uniqueCustomers: acc.uniqueCustomers + day.uniqueCustomers,
      }),
      { totalOrders: 0, totalRevenue: 0, uniqueCustomers: 0 }
    );

    res.json({
      period: { startDate: start, endDate: end },
      source,
      totals: {
        ...totals,
        avgOrderValue: totals.totalOrders > 0 ? Math.round(totals.totalRevenue / totals.totalOrders) : 0,
      },
      daily: data,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
