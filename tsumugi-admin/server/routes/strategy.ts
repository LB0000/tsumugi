import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { strategicGoals } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const strategyRouter = Router();
strategyRouter.use(requireAuth);

strategyRouter.get('/goals', (_req, res) => {
  try {
    const goals = db.select().from(strategicGoals).all();
    res.json({ goals });
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
    db.delete(strategicGoals).where(eq(strategicGoals.id, req.params.id)).run();
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
