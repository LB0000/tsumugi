import { Router } from 'express';
import { db } from '../db/index.js';
import { automations, automationEnrollments, customers, emailSends } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth } from '../lib/auth.js';
import { checkAndEnrollTriggers } from '../lib/automation-engine.js';

export const automationsRouter = Router();
automationsRouter.use(requireAuth);

const VALID_TRIGGERS = ['welcome', 'post_purchase', 'reactivation', 're_engagement'] as const;
const TRIGGER_LABELS: Record<string, string> = {
  welcome: 'ウェルカム',
  post_purchase: '購入後フォロー',
  reactivation: '休眠復帰',
  re_engagement: '再エンゲージメント',
};
const VALID_SKIP_CONDITIONS = ['purchased_since_trigger', 'became_active'];

function isValidStep(step: unknown): boolean {
  if (!step || typeof step !== 'object') return false;
  const s = step as Record<string, unknown>;
  return (
    typeof s.stepIndex === 'number' &&
    Number.isInteger(s.stepIndex) &&
    s.stepIndex >= 0 &&
    typeof s.delayMinutes === 'number' &&
    Number.isFinite(s.delayMinutes) &&
    s.delayMinutes >= 0 &&
    s.delayMinutes <= 43200 &&
    typeof s.subject === 'string' &&
    s.subject.length <= 200 &&
    typeof s.htmlBody === 'string' &&
    s.htmlBody.length <= 50000 &&
    typeof s.useAiGeneration === 'boolean' &&
    // When AI generation is off, subject and body must be non-empty
    (s.useAiGeneration === true || (s.subject as string).trim().length > 0) &&
    (s.useAiGeneration === true || (s.htmlBody as string).trim().length > 0) &&
    (s.aiPurpose === undefined || typeof s.aiPurpose === 'string') &&
    (s.aiTopic === undefined || typeof s.aiTopic === 'string') &&
    (s.skipCondition === undefined ||
      s.skipCondition === null ||
      VALID_SKIP_CONDITIONS.includes(s.skipCondition as string))
  );
}

function validateSteps(steps: unknown[]): boolean {
  return steps.every(isValidStep);
}

// GET /api/automations — list all with enrollment counts
automationsRouter.get('/', (_req, res) => {
  try {
    const rows = db.select().from(automations).orderBy(desc(automations.updatedAt)).all();

    const result = rows.map((a) => {
      const enrollmentCounts = db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
          completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        })
        .from(automationEnrollments)
        .where(eq(automationEnrollments.automationId, a.id))
        .get();

      const sentCount = db
        .select({ count: sql<number>`count(*)` })
        .from(emailSends)
        .where(eq(emailSends.automationId, a.id))
        .get();

      return {
        ...a,
        triggerLabel: TRIGGER_LABELS[a.triggerType] || a.triggerType,
        enrollments: {
          total: enrollmentCounts?.total ?? 0,
          active: enrollmentCounts?.active ?? 0,
          completed: enrollmentCounts?.completed ?? 0,
        },
        totalSent: sentCount?.count ?? 0,
      };
    });

    res.json({ automations: result });
  } catch (error) {
    console.error('List automations error:', error);
    res.status(500).json({ error: 'オートメーション一覧の取得に失敗しました' });
  }
});

// GET /api/automations/:id — single automation with stats
automationsRouter.get('/:id', (req, res) => {
  try {
    const automation = db
      .select()
      .from(automations)
      .where(eq(automations.id, req.params.id))
      .get();

    if (!automation) {
      res.status(404).json({ error: 'オートメーションが見つかりません' });
      return;
    }

    const stats = db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
        completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        stopped: sql<number>`sum(case when status = 'stopped' then 1 else 0 end)`,
      })
      .from(automationEnrollments)
      .where(eq(automationEnrollments.automationId, automation.id))
      .get();

    const sendStats = db
      .select({
        totalSent: sql<number>`count(*)`,
        totalFailed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
      })
      .from(emailSends)
      .where(eq(emailSends.automationId, automation.id))
      .get();

    res.json({
      ...automation,
      triggerLabel: TRIGGER_LABELS[automation.triggerType] || automation.triggerType,
      stats: {
        totalEnrolled: stats?.total ?? 0,
        active: stats?.active ?? 0,
        completed: stats?.completed ?? 0,
        stopped: stats?.stopped ?? 0,
        totalSent: sendStats?.totalSent ?? 0,
        totalFailed: sendStats?.totalFailed ?? 0,
      },
    });
  } catch (error) {
    console.error('Get automation error:', error);
    res.status(500).json({ error: 'オートメーションの取得に失敗しました' });
  }
});

// POST /api/automations — create
automationsRouter.post('/', (req, res) => {
  try {
    const { name, triggerType, steps } = req.body as {
      name?: string;
      triggerType?: string;
      steps?: unknown[];
    };

    if (!name?.trim()) {
      res.status(400).json({ error: '名前は必須です' });
      return;
    }
    if (name.trim().length > 200) {
      res.status(400).json({ error: '名前は200文字以内にしてください' });
      return;
    }
    if (!triggerType || !VALID_TRIGGERS.includes(triggerType as typeof VALID_TRIGGERS[number])) {
      res.status(400).json({ error: '無効なトリガータイプです' });
      return;
    }
    if (!Array.isArray(steps) || steps.length === 0 || steps.length > 5) {
      res.status(400).json({ error: 'ステップは1〜5個必要です' });
      return;
    }
    if (!validateSteps(steps)) {
      res.status(400).json({ error: 'ステップの形式が不正です' });
      return;
    }

    const now = new Date().toISOString();
    const id = nanoid();

    db.insert(automations)
      .values({
        id,
        name: name.trim(),
        triggerType,
        status: 'draft',
        steps: JSON.stringify(steps),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const created = db.select().from(automations).where(eq(automations.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Create automation error:', error);
    res.status(500).json({ error: 'オートメーションの作成に失敗しました' });
  }
});

// PUT /api/automations/:id — update
automationsRouter.put('/:id', (req, res) => {
  try {
    const existing = db
      .select()
      .from(automations)
      .where(eq(automations.id, req.params.id))
      .get();

    if (!existing) {
      res.status(404).json({ error: 'オートメーションが見つかりません' });
      return;
    }

    if (existing.status === 'active') {
      res.status(400).json({ error: '有効なオートメーションは編集できません。先に一時停止してください' });
      return;
    }

    const { name, triggerType, steps } = req.body as {
      name?: string;
      triggerType?: string;
      steps?: unknown[];
    };

    const now = new Date().toISOString();
    const updates: Partial<typeof automations.$inferInsert> = { updatedAt: now };

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: '名前は必須です' });
        return;
      }
      if (name.trim().length > 200) {
        res.status(400).json({ error: '名前は200文字以内にしてください' });
        return;
      }
      updates.name = name.trim();
    }
    if (triggerType !== undefined) {
      if (!VALID_TRIGGERS.includes(triggerType as typeof VALID_TRIGGERS[number])) {
        res.status(400).json({ error: '無効なトリガータイプです' });
        return;
      }
      updates.triggerType = triggerType;
    }
    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length === 0 || steps.length > 5) {
        res.status(400).json({ error: 'ステップは1〜5個必要です' });
        return;
      }
      if (!validateSteps(steps)) {
        res.status(400).json({ error: 'ステップの形式が不正です' });
        return;
      }
      updates.steps = JSON.stringify(steps);
    }

    db.update(automations)
      .set(updates)
      .where(eq(automations.id, req.params.id))
      .run();

    const updated = db.select().from(automations).where(eq(automations.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update automation error:', error);
    res.status(500).json({ error: 'オートメーションの更新に失敗しました' });
  }
});

// DELETE /api/automations/:id
automationsRouter.delete('/:id', (req, res) => {
  try {
    const existing = db
      .select()
      .from(automations)
      .where(eq(automations.id, req.params.id))
      .get();

    if (!existing) {
      res.status(404).json({ error: 'オートメーションが見つかりません' });
      return;
    }

    if (existing.status === 'active') {
      res.status(400).json({ error: '有効なオートメーションは削除できません。先に一時停止してください' });
      return;
    }

    db.transaction((tx) => {
      tx.delete(emailSends)
        .where(eq(emailSends.automationId, req.params.id))
        .run();
      tx.delete(automationEnrollments)
        .where(eq(automationEnrollments.automationId, req.params.id))
        .run();
      tx.delete(automations)
        .where(eq(automations.id, req.params.id))
        .run();
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete automation error:', error);
    res.status(500).json({ error: 'オートメーションの削除に失敗しました' });
  }
});

// POST /api/automations/:id/activate
automationsRouter.post('/:id/activate', (req, res) => {
  try {
    const existing = db
      .select()
      .from(automations)
      .where(eq(automations.id, req.params.id))
      .get();

    if (!existing) {
      res.status(404).json({ error: 'オートメーションが見つかりません' });
      return;
    }

    if (existing.status === 'active') {
      res.status(400).json({ error: 'すでに有効化されています' });
      return;
    }

    // Validate steps before activation
    let parsedSteps: unknown[];
    try {
      parsedSteps = JSON.parse(existing.steps);
    } catch {
      parsedSteps = [];
    }
    if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
      res.status(400).json({ error: 'ステップが設定されていません' });
      return;
    }

    const now = new Date().toISOString();
    db.update(automations)
      .set({ status: 'active', updatedAt: now })
      .where(eq(automations.id, req.params.id))
      .run();

    res.json({ success: true, status: 'active' });

    // Run initial enrollment check after response (non-critical)
    setTimeout(() => {
      try { checkAndEnrollTriggers(); } catch { /* Cron will catch up */ }
    }, 0);
  } catch (error) {
    console.error('Activate automation error:', error);
    res.status(500).json({ error: 'オートメーションの有効化に失敗しました' });
  }
});

// POST /api/automations/:id/pause
automationsRouter.post('/:id/pause', (req, res) => {
  try {
    const existing = db
      .select()
      .from(automations)
      .where(eq(automations.id, req.params.id))
      .get();

    if (!existing) {
      res.status(404).json({ error: 'オートメーションが見つかりません' });
      return;
    }

    if (existing.status !== 'active') {
      res.status(400).json({ error: '有効なオートメーションのみ一時停止できます' });
      return;
    }

    const now = new Date().toISOString();
    db.update(automations)
      .set({ status: 'paused', updatedAt: now })
      .where(eq(automations.id, req.params.id))
      .run();

    res.json({ success: true, status: 'paused' });
  } catch (error) {
    console.error('Pause automation error:', error);
    res.status(500).json({ error: 'オートメーションの一時停止に失敗しました' });
  }
});

// GET /api/automations/:id/enrollments
automationsRouter.get('/:id/enrollments', (req, res) => {
  try {
    const rows = db
      .select({
        id: automationEnrollments.id,
        automationId: automationEnrollments.automationId,
        customerId: automationEnrollments.customerId,
        currentStepIndex: automationEnrollments.currentStepIndex,
        status: automationEnrollments.status,
        nextSendAt: automationEnrollments.nextSendAt,
        enrolledAt: automationEnrollments.enrolledAt,
        completedAt: automationEnrollments.completedAt,
        customerEmail: customers.email,
        customerName: customers.name,
      })
      .from(automationEnrollments)
      .leftJoin(customers, eq(automationEnrollments.customerId, customers.id))
      .where(eq(automationEnrollments.automationId, req.params.id))
      .orderBy(desc(automationEnrollments.enrolledAt))
      .all();

    res.json({ enrollments: rows });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: '登録一覧の取得に失敗しました' });
  }
});

// POST /api/automations/:id/enrollments/:eid/stop
automationsRouter.post('/:id/enrollments/:eid/stop', (req, res) => {
  try {
    const enrollment = db
      .select()
      .from(automationEnrollments)
      .where(
        and(
          eq(automationEnrollments.id, req.params.eid),
          eq(automationEnrollments.automationId, req.params.id),
        ),
      )
      .get();

    if (!enrollment) {
      res.status(404).json({ error: '登録が見つかりません' });
      return;
    }

    if (enrollment.status !== 'active') {
      res.status(400).json({ error: 'アクティブな登録のみ停止できます' });
      return;
    }

    const now = new Date().toISOString();
    db.update(automationEnrollments)
      .set({ status: 'stopped', updatedAt: now })
      .where(eq(automationEnrollments.id, req.params.eid))
      .run();

    res.json({ success: true });
  } catch (error) {
    console.error('Stop enrollment error:', error);
    res.status(500).json({ error: '登録の停止に失敗しました' });
  }
});
