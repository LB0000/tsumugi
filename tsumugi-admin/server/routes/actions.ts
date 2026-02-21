import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { actionPlans, strategicGoals, campaigns, coupons, customers } from '../db/schema.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { randomBytes } from 'node:crypto';
import { sendBulkMarketingEmails } from '../lib/email.js';
import { generateContent, type ContentType, type Platform } from '../lib/gemini-text.js';
import { syncCustomers } from '../lib/customer-sync.js';

export const actionsRouter = Router();
actionsRouter.use(requireAuth);

const VALID_ACTION_TYPES = ['email', 'coupon', 'content', 'sync', 'manual'] as const;
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed'] as const;
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;

function parseConfig(configJson: string | null): Record<string, unknown> {
  if (!configJson) return {};
  try {
    const parsed = JSON.parse(configJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON in action plan config');
  }
}

// GET /api/actions?goalId=xxx — list action plans for a goal
actionsRouter.get('/', (req, res) => {
  try {
    const { goalId } = req.query as { goalId?: string };
    const plans = goalId?.trim()
      ? db.select().from(actionPlans).where(eq(actionPlans.goalId, goalId.trim())).all()
      : db.select().from(actionPlans).all();
    res.json({ actions: plans });
  } catch (error) {
    console.error('List action plans error:', error);
    res.status(500).json({ error: 'Failed to list action plans' });
  }
});

// POST /api/actions — create an action plan
actionsRouter.post('/', (req, res) => {
  try {
    const { goalId, title, description, actionType, priority, dueDate, config } = req.body as {
      goalId?: string; title?: string; description?: string;
      actionType?: string; priority?: string; dueDate?: string; config?: string;
    };

    if (!goalId?.trim()) { res.status(400).json({ error: 'goalId is required' }); return; }
    if (!title?.trim()) { res.status(400).json({ error: 'title is required' }); return; }
    if (!actionType || !VALID_ACTION_TYPES.includes(actionType as typeof VALID_ACTION_TYPES[number])) {
      res.status(400).json({ error: `actionType must be one of: ${VALID_ACTION_TYPES.join(', ')}` }); return;
    }

    const goal = db.select().from(strategicGoals).where(eq(strategicGoals.id, goalId.trim())).get();
    if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }

    if (config) {
      try { JSON.parse(config); } catch {
        res.status(400).json({ error: 'config must be valid JSON' }); return;
      }
    }

    const validPriority = priority && VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])
      ? priority : 'medium';

    const now = new Date().toISOString();
    const plan = {
      id: nanoid(),
      goalId: goalId.trim(),
      title: title.trim(),
      description: description?.trim() || null,
      actionType,
      status: 'pending',
      priority: validPriority,
      dueDate: dueDate?.trim() || null,
      config: config || null,
      executedAt: null,
      executionResult: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    db.insert(actionPlans).values(plan).run();
    res.status(201).json(plan);
  } catch (error) {
    console.error('Create action plan error:', error);
    res.status(500).json({ error: 'Failed to create action plan' });
  }
});

// PUT /api/actions/:id — update an action plan
actionsRouter.put('/:id', (req, res) => {
  try {
    const existing = db.select().from(actionPlans).where(eq(actionPlans.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Action plan not found' }); return; }

    const { title, description, status, priority, dueDate, config } = req.body as {
      title?: string; description?: string; status?: string;
      priority?: string; dueDate?: string; config?: string;
    };

    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }); return;
    }
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) {
      res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }); return;
    }
    if (config !== undefined && config !== null) {
      try { JSON.parse(config); } catch {
        res.status(400).json({ error: 'config must be valid JSON' }); return;
      }
    }

    const now = new Date().toISOString();
    db.update(actionPlans)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate?.trim() || null }),
        ...(config !== undefined && { config }),
        ...(status === 'completed' && { completedAt: now }),
        ...(status !== undefined && status !== 'completed' && { completedAt: null }),
        updatedAt: now,
      })
      .where(eq(actionPlans.id, req.params.id))
      .run();

    const updated = db.select().from(actionPlans).where(eq(actionPlans.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update action plan error:', error);
    res.status(500).json({ error: 'Failed to update action plan' });
  }
});

// DELETE /api/actions/:id
actionsRouter.delete('/:id', (req, res) => {
  try {
    const existing = db.select().from(actionPlans).where(eq(actionPlans.id, req.params.id)).get();
    if (!existing) { res.status(404).json({ error: 'Action plan not found' }); return; }
    db.delete(actionPlans).where(eq(actionPlans.id, req.params.id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete action plan error:', error);
    res.status(500).json({ error: 'Failed to delete action plan' });
  }
});

// POST /api/actions/:id/execute — execute an action plan
actionsRouter.post('/:id/execute', async (req, res) => {
  try {
    // Atomic status transition to prevent double-execution
    const transition = db.run(
      sql`UPDATE action_plans SET status = 'in_progress', updated_at = ${new Date().toISOString()} WHERE id = ${req.params.id} AND status IN ('pending', 'failed')`,
    );

    if (transition.changes === 0) {
      const current = db.select().from(actionPlans).where(eq(actionPlans.id, req.params.id)).get();
      if (!current) { res.status(404).json({ error: 'Action plan not found' }); return; }
      res.status(409).json({ error: `Cannot execute: current status is '${current.status}'` }); return;
    }

    const plan = db.select().from(actionPlans).where(eq(actionPlans.id, req.params.id)).get()!;

    let result: Record<string, unknown>;

    switch (plan.actionType) {
      case 'email':
        result = await executeEmail(plan.config);
        break;
      case 'coupon':
        result = executeCoupon(plan.config);
        break;
      case 'content':
        result = await executeContent(plan.config);
        break;
      case 'sync':
        result = await executeSync();
        break;
      case 'manual':
        result = { success: true, message: '手動タスクを完了としてマーク' };
        break;
      default:
        result = { success: false, error: `Unknown action type: ${plan.actionType}` };
    }

    const now = new Date().toISOString();
    const finalStatus = result.success ? 'completed' : 'failed';

    db.update(actionPlans)
      .set({
        status: finalStatus,
        executedAt: now,
        executionResult: JSON.stringify(result),
        updatedAt: now,
        ...(finalStatus === 'completed' && { completedAt: now }),
      })
      .where(eq(actionPlans.id, plan.id))
      .run();

    const updated = db.select().from(actionPlans).where(eq(actionPlans.id, plan.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Execute action plan error:', error);
    try {
      db.update(actionPlans)
        .set({
          status: 'failed',
          executedAt: new Date().toISOString(),
          executionResult: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(actionPlans.id, req.params.id))
        .run();
    } catch (dbError) {
      console.error('Failed to mark action as failed:', dbError);
    }
    res.status(500).json({ error: 'Failed to execute action plan' });
  }
});

// --- Execution helpers ---

async function executeEmail(configJson: string | null): Promise<Record<string, unknown>> {
  const config = parseConfig(configJson);
  const subject = typeof config.subject === 'string' ? config.subject : '';
  const htmlBody = typeof config.htmlBody === 'string' ? config.htmlBody : '';
  const segment = typeof config.segment === 'string' ? config.segment : undefined;

  if (!subject.trim() || !htmlBody.trim()) {
    return { success: false, error: 'subject and htmlBody are required in config' };
  }

  // Get recipients
  const validSegments = ['new', 'active', 'lapsed'];
  const recipients = segment && validSegments.includes(segment)
    ? db.select().from(customers).where(and(eq(customers.segment, segment), isNull(customers.marketingOptOutAt))).all()
    : db.select().from(customers).where(isNull(customers.marketingOptOutAt)).all();

  if (recipients.length === 0) {
    return { success: false, error: 'No recipients found' };
  }

  const emails = recipients.map((r) => r.email);
  const result = await sendBulkMarketingEmails(emails, subject.trim(), htmlBody.trim());

  // Create a campaign record for tracking
  const now = new Date().toISOString();
  const campaign = {
    id: nanoid(),
    name: `Action: ${subject.trim().slice(0, 50)}`,
    type: 'email',
    status: 'completed',
    description: `Auto-created by action plan execution`,
    config: null,
    startDate: now,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(campaigns).values(campaign).run();

  return { success: true, sent: result.sent, failed: result.failed, total: recipients.length, campaignId: campaign.id };
}

function executeCoupon(configJson: string | null): Record<string, unknown> {
  const config = parseConfig(configJson);
  const discountType = typeof config.discountType === 'string' ? config.discountType : 'percentage';
  const discountValue = typeof config.discountValue === 'number' ? config.discountValue : 10;
  const maxUses = typeof config.maxUses === 'number' ? config.maxUses : undefined;
  const expiresAt = typeof config.expiresAt === 'string' ? config.expiresAt : undefined;

  if (!['percentage', 'fixed'].includes(discountType)) {
    return { success: false, error: 'discountType must be percentage or fixed' };
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { success: false, error: 'discountValue must be positive' };
  }

  const code = `TSUMUGI-${randomBytes(4).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();
  const coupon = {
    id: nanoid(),
    code,
    discountType,
    discountValue,
    maxUses: maxUses ?? null,
    currentUses: 0,
    campaignId: null,
    expiresAt: expiresAt || null,
    createdAt: now,
    isActive: true,
  };

  db.insert(coupons).values(coupon).run();
  return { success: true, couponCode: code, discountType, discountValue };
}

async function executeContent(configJson: string | null): Promise<Record<string, unknown>> {
  const config = parseConfig(configJson);
  const contentType = typeof config.contentType === 'string' ? config.contentType as ContentType : 'sns_post';
  const platform = typeof config.platform === 'string' ? config.platform as Platform : 'instagram';
  const topic = typeof config.topic === 'string' ? config.topic : '';

  if (!topic.trim()) {
    return { success: false, error: 'topic is required in config' };
  }

  const body = await generateContent(contentType, platform, topic.trim());
  return { success: true, contentType, platform, generatedContent: body.slice(0, 500) };
}

async function executeSync(): Promise<Record<string, unknown>> {
  const result = await syncCustomers();
  return { success: true, ...result };
}
