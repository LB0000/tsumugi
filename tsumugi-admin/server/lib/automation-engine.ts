import { db } from '../db/index.js';
import { automations, automationEnrollments, customers, emailSends } from '../db/schema.js';
import { eq, and, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendMarketingEmail } from './email.js';
import { generateEmailContent, type EmailSegment, type EmailPurpose } from './gemini-text.js';
import { createAlert } from './alerts.js';

export interface AutomationStep {
  stepIndex: number;
  delayMinutes: number;
  subject: string;
  htmlBody: string;
  useAiGeneration: boolean;
  aiPurpose?: string;
  aiTopic?: string;
  skipCondition?: string | null;
}

type TriggerType = 'welcome' | 'post_purchase' | 'reactivation' | 're_engagement';

const VALID_SKIP_CONDITIONS = new Set(['purchased_since_trigger', 'became_active']);
const BATCH_SIZE = 50;

function parseSteps(stepsJson: string): AutomationStep[] {
  try {
    const parsed = JSON.parse(stepsJson);
    if (!Array.isArray(parsed)) {
      console.error('[automation] Steps is not an array:', typeof parsed);
      return [];
    }
    return parsed as AutomationStep[];
  } catch (err) {
    console.error('[automation] Failed to parse automation steps:', err);
    return [];
  }
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

// ─── Process Single Enrollment ──────────────────────────────────

type EnrollmentOutcome = 'sent' | 'skipped' | 'failed' | 'completed';

async function processEnrollment(
  enrollment: { id: string; automationId: string; customerId: string; currentStepIndex: number; enrolledAt: string },
  now: string,
): Promise<EnrollmentOutcome | null> {
  const automation = db
    .select()
    .from(automations)
    .where(eq(automations.id, enrollment.automationId))
    .get();

  if (!automation || automation.status !== 'active') return null;

  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, enrollment.customerId))
    .get();

  if (!customer) {
    stopEnrollment(enrollment.id, now);
    return null;
  }

  if (customer.marketingOptOutAt) {
    stopEnrollment(enrollment.id, now);
    return 'skipped';
  }

  const steps = parseSteps(automation.steps);
  const step = steps[enrollment.currentStepIndex];
  if (!step) {
    completeEnrollment(enrollment.id, now);
    return 'completed';
  }

  if (shouldSkipStep(step, customer, enrollment.enrolledAt)) {
    advanceOrComplete(enrollment.id, enrollment.currentStepIndex, steps, now);
    return 'skipped';
  }

  const content = await resolveStepContent(step, automation.triggerType as TriggerType);

  if (!content) {
    // AI failed and no static fallback — stop to prevent repeated failures
    stopEnrollment(enrollment.id, now);
    console.warn(`[automation] Stopped enrollment ${enrollment.id}: no content available for step ${step.stepIndex}`);
    return 'failed';
  }

  const emailResult = await sendMarketingEmail({
    to: customer.email,
    subject: content.subject,
    htmlBody: content.htmlBody,
  });

  db.insert(emailSends)
    .values({
      id: nanoid(),
      automationId: automation.id,
      recipientEmail: customer.email,
      subject: content.subject,
      status: emailResult.success ? 'sent' : 'failed',
      sentAt: now,
    })
    .run();

  if (emailResult.success) {
    advanceOrComplete(enrollment.id, enrollment.currentStepIndex, steps, now);
    return 'sent';
  }

  // Stop enrollment on send failure to prevent infinite retry
  stopEnrollment(enrollment.id, now);
  console.warn(`[automation] Stopped enrollment ${enrollment.id} due to send failure`);
  return 'failed';
}

function shouldSkipStep(
  step: AutomationStep,
  customer: { lastPurchaseAt: string | null; segment: string | null },
  enrolledAt: string,
): boolean {
  if (!step.skipCondition) return false;

  if (!VALID_SKIP_CONDITIONS.has(step.skipCondition)) {
    console.warn(`[automation] Unknown skip condition "${step.skipCondition}" on step ${step.stepIndex}`);
    return false;
  }

  if (step.skipCondition === 'purchased_since_trigger') {
    return !!(customer.lastPurchaseAt && customer.lastPurchaseAt > enrolledAt);
  }
  if (step.skipCondition === 'became_active') {
    return customer.segment === 'active';
  }
  return false;
}

async function resolveStepContent(
  step: AutomationStep,
  triggerType: TriggerType,
): Promise<{ subject: string; htmlBody: string } | null> {
  if (!step.useAiGeneration) {
    return { subject: step.subject, htmlBody: step.htmlBody };
  }

  try {
    const segment = mapTriggerToSegment(triggerType);
    const purpose = (step.aiPurpose || 'newsletter') as EmailPurpose;
    const generated = await generateEmailContent(segment, purpose, step.aiTopic || '');
    return { subject: generated.subject, htmlBody: generated.body };
  } catch (err) {
    console.error('[automation] AI generation failed, falling back to static content:', err);
    if (step.subject && step.htmlBody) {
      return { subject: step.subject, htmlBody: step.htmlBody };
    }
    return null;
  }
}

// ─── Process Queue (cron: every 15 min) ─────────────────────────

export async function processAutomationQueue(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  completed: number;
}> {
  const now = new Date().toISOString();
  const result = { processed: 0, sent: 0, skipped: 0, failed: 0, completed: 0 };

  const dueEnrollments = db
    .select()
    .from(automationEnrollments)
    .where(
      and(
        eq(automationEnrollments.status, 'active'),
        lte(automationEnrollments.nextSendAt, now),
      ),
    )
    .limit(BATCH_SIZE)
    .all();

  for (const enrollment of dueEnrollments) {
    result.processed++;
    try {
      const outcome = await processEnrollment(enrollment, now);
      if (outcome) result[outcome]++;
    } catch (err) {
      result.failed++;
      console.error(`[automation] Error processing enrollment ${enrollment.id}:`, err);
    }
  }

  if (result.failed >= 3) {
    createAlert({
      type: 'sync_failure',
      severity: 'warning',
      title: 'オートメーション送信エラー',
      message: `自動メール処理で${result.failed}件のエラーが発生しました`,
    });
  }

  return result;
}

// ─── Enrollment State Helpers ───────────────────────────────────

function stopEnrollment(enrollmentId: string, now: string): void {
  db.update(automationEnrollments)
    .set({ status: 'stopped', updatedAt: now })
    .where(eq(automationEnrollments.id, enrollmentId))
    .run();
}

function completeEnrollment(enrollmentId: string, now: string): void {
  db.update(automationEnrollments)
    .set({ status: 'completed', completedAt: now, updatedAt: now })
    .where(eq(automationEnrollments.id, enrollmentId))
    .run();
}

function advanceOrComplete(
  enrollmentId: string,
  currentIndex: number,
  steps: AutomationStep[],
  now: string,
): void {
  const nextIndex = currentIndex + 1;
  if (nextIndex >= steps.length) {
    db.update(automationEnrollments)
      .set({ status: 'completed', completedAt: now, currentStepIndex: nextIndex, updatedAt: now })
      .where(eq(automationEnrollments.id, enrollmentId))
      .run();
  } else {
    const nextStep = steps[nextIndex];
    const nextSendAt = addMinutes(new Date(now), nextStep.delayMinutes);
    db.update(automationEnrollments)
      .set({ currentStepIndex: nextIndex, nextSendAt, updatedAt: now })
      .where(eq(automationEnrollments.id, enrollmentId))
      .run();
  }
}

function mapTriggerToSegment(trigger: TriggerType): EmailSegment {
  switch (trigger) {
    case 'welcome': return 'new';
    case 'post_purchase': return 'active';
    case 'reactivation': return 'lapsed';
    case 're_engagement': return 'active';
  }
}

// ─── Check & Enroll Triggers (cron: hourly at :05) ──────────────

export function checkAndEnrollTriggers(): void {
  const activeAutomations = db
    .select()
    .from(automations)
    .where(eq(automations.status, 'active'))
    .all();

  for (const automation of activeAutomations) {
    const trigger = automation.triggerType as TriggerType;
    const steps = parseSteps(automation.steps);
    if (steps.length === 0) continue;

    const candidates = findCandidates(trigger);

    for (const customer of candidates) {
      const existing = db
        .select({ id: automationEnrollments.id })
        .from(automationEnrollments)
        .where(
          and(
            eq(automationEnrollments.automationId, automation.id),
            eq(automationEnrollments.customerId, customer.id),
            eq(automationEnrollments.status, 'active'),
          ),
        )
        .get();

      if (existing) continue;

      enrollCustomer(automation.id, customer.id, steps);
    }
  }
}

function findCandidates(trigger: TriggerType) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

  switch (trigger) {
    case 'welcome':
      return db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.segment, 'new'),
            sql`${customers.registeredAt} >= ${oneDayAgo}`,
            sql`${customers.marketingOptOutAt} IS NULL`,
          ),
        )
        .all();

    case 'post_purchase':
      return db
        .select()
        .from(customers)
        .where(
          and(
            sql`${customers.totalOrders} >= 1`,
            sql`${customers.firstPurchaseAt} >= ${oneDayAgo}`,
            sql`${customers.marketingOptOutAt} IS NULL`,
          ),
        )
        .all();

    case 'reactivation':
      return db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.segment, 'lapsed'),
            sql`${customers.marketingOptOutAt} IS NULL`,
          ),
        )
        .limit(100)
        .all();

    case 're_engagement':
      return db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.segment, 'active'),
            sql`${customers.lastPurchaseAt} <= ${thirtyDaysAgo}`,
            sql`${customers.marketingOptOutAt} IS NULL`,
          ),
        )
        .all();
  }
}

// ─── Enroll Customer ────────────────────────────────────────────

export function enrollCustomer(
  automationId: string,
  customerId: string,
  providedSteps?: AutomationStep[],
): void {
  const steps = providedSteps ?? loadStepsForAutomation(automationId);
  if (!steps || steps.length === 0) return;

  const now = new Date().toISOString();
  const firstDelay = steps[0].delayMinutes;
  const nextSendAt = addMinutes(new Date(now), firstDelay);

  try {
    db.insert(automationEnrollments)
      .values({
        id: nanoid(),
        automationId,
        customerId,
        currentStepIndex: 0,
        status: 'active',
        nextSendAt,
        enrolledAt: now,
        updatedAt: now,
      })
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE constraint failed')) {
      return; // Already actively enrolled
    }
    console.error(`[automation] Failed to enroll customer ${customerId}:`, message);
  }
}

function loadStepsForAutomation(automationId: string): AutomationStep[] | null {
  const automation = db
    .select()
    .from(automations)
    .where(eq(automations.id, automationId))
    .get();
  if (!automation) return null;
  return parseSteps(automation.steps);
}
