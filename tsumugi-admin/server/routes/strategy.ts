import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { strategicGoals, actionPlans, customers } from '../db/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const strategyRouter = Router();
strategyRouter.use(requireAuth);

const TSUMUGI_API_URL = process.env.TSUMUGI_API_URL || 'http://localhost:3001/api';

const AUTO_KPI_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), AUTO_KPI_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchAutoKpi(category: string): Promise<{ autoValue: number | null; label: string; source: string }> {
  switch (category) {
    case 'reviews': {
      try {
        const response = await fetchWithTimeout(`${TSUMUGI_API_URL}/reviews/summary`);
        if (!response.ok) return { autoValue: null, label: 'レビュー数', source: 'unavailable' };
        const data = (await response.json()) as { totalReviews?: number };
        return { autoValue: typeof data.totalReviews === 'number' ? data.totalReviews : null, label: 'レビュー数', source: 'reviews-api' };
      } catch { return { autoValue: null, label: 'レビュー数', source: 'error' }; }
    }
    case 'revenue': {
      // Use local DB directly -- avoids leaking credentials to external service
      const row = db.get<{ total: number }>(sql`SELECT COALESCE(SUM(total_revenue), 0) as total FROM analytics_snapshots`);
      return { autoValue: row?.total ?? null, label: '売上（累計）', source: 'local-db' };
    }
    case 'customers': {
      const row = db.get<{ total: number }>(sql`SELECT COUNT(*) as total FROM customers`);
      return { autoValue: row?.total ?? 0, label: '顧客数', source: 'local-db' };
    }
    case 'email_list': {
      const row = db.get<{ total: number }>(sql`SELECT COUNT(*) as total FROM customers WHERE marketing_opt_out_at IS NULL`);
      return { autoValue: row?.total ?? 0, label: 'メール配信可能数', source: 'local-db' };
    }
    default:
      return { autoValue: null, label: '', source: 'none' };
  }
}

strategyRouter.get('/goals', async (_req, res) => {
  try {
    const goals = db.select().from(strategicGoals).all();

    // Enrich with auto KPI for applicable categories
    const autoCategories = ['reviews', 'revenue', 'customers', 'email_list'];
    const enriched = await Promise.all(
      goals.map(async (goal) => {
        if (autoCategories.includes(goal.category)) {
          const autoKpi = await fetchAutoKpi(goal.category);
          return { ...goal, autoKpi: { category: goal.category, ...autoKpi } };
        }
        return goal;
      }),
    );

    res.json({ goals: enriched });
  } catch (error) {
    console.error('List strategic goals error:', error);
    res.status(500).json({ error: 'Failed to list strategic goals' });
  }
});

strategyRouter.post('/goals', (req, res) => {
  try {
    const { name, category, targetValue, unit, deadline } = req.body as {
      name?: string;
      category?: string;
      targetValue?: number;
      unit?: string;
      deadline?: string;
    };

    if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
    if (!category?.trim()) { res.status(400).json({ error: 'category is required' }); return; }
    if (typeof targetValue !== 'number' || !Number.isFinite(targetValue)) { res.status(400).json({ error: 'targetValue must be a number' }); return; }
    if (!unit?.trim()) { res.status(400).json({ error: 'unit is required' }); return; }
    if (!deadline?.trim()) { res.status(400).json({ error: 'deadline is required' }); return; }

    const now = new Date().toISOString();
    const goal = {
      id: nanoid(),
      name: name.trim(),
      category: category.trim(),
      targetValue,
      currentValue: 0,
      unit: unit.trim(),
      deadline: deadline.trim(),
      createdAt: now,
      updatedAt: now,
    };

    db.insert(strategicGoals).values(goal).run();
    res.status(201).json(goal);
  } catch (error) {
    console.error('Create strategic goal error:', error);
    res.status(500).json({ error: 'Failed to create strategic goal' });
  }
});

strategyRouter.put('/goals/:id', (req, res) => {
  try {
    const existing = db.select().from(strategicGoals).where(eq(strategicGoals.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

    const { name, category, targetValue, currentValue, unit, deadline } = req.body as {
      name?: string; category?: string; targetValue?: number; currentValue?: number; unit?: string; deadline?: string;
    };

    if (targetValue !== undefined && (typeof targetValue !== 'number' || !Number.isFinite(targetValue))) {
      res.status(400).json({ error: 'targetValue must be a finite number' }); return;
    }
    if (currentValue !== undefined && (typeof currentValue !== 'number' || !Number.isFinite(currentValue))) {
      res.status(400).json({ error: 'currentValue must be a finite number' }); return;
    }

    db.update(strategicGoals)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(targetValue !== undefined && { targetValue }),
        ...(currentValue !== undefined && { currentValue }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(deadline !== undefined && { deadline: deadline.trim() }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(strategicGoals.id, req.params.id))
      .run();

    const updated = db.select().from(strategicGoals).where(eq(strategicGoals.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update strategic goal error:', error);
    res.status(500).json({ error: 'Failed to update strategic goal' });
  }
});

strategyRouter.delete('/goals/:id', (req, res) => {
  try {
    const existing = db.select().from(strategicGoals).where(eq(strategicGoals.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

    // Delete associated action plans first to avoid FK constraint violation
    db.transaction((tx) => {
      tx.delete(actionPlans).where(eq(actionPlans.goalId, req.params.id)).run();
      tx.delete(strategicGoals).where(eq(strategicGoals.id, req.params.id)).run();
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete strategic goal error:', error);
    res.status(500).json({ error: 'Failed to delete strategic goal' });
  }
});

strategyRouter.patch('/goals/:id/progress', (req, res) => {
  try {
    const existing = db.select().from(strategicGoals).where(eq(strategicGoals.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

    const { currentValue } = req.body as { currentValue?: number };
    if (typeof currentValue !== 'number' || !Number.isFinite(currentValue)) {
      res.status(400).json({ error: 'currentValue must be a number' }); return;
    }

    db.update(strategicGoals)
      .set({ currentValue, updatedAt: new Date().toISOString() })
      .where(eq(strategicGoals.id, req.params.id))
      .run();

    const updated = db.select().from(strategicGoals).where(eq(strategicGoals.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});
