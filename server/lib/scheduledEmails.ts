import path from 'path';
import { randomBytes } from 'crypto';
import { readJsonFile } from './persistence.js';
import { logger } from './logger.js';
import { hasSupabaseConfig } from './supabaseClient.js';
import { sendReviewRequestEmail } from './email.js';
import { loadScheduledEmailsSnapshot, persistScheduledEmailsSnapshot } from './scheduledEmailsStore.js';
import type { ScheduledEmail } from './scheduledEmailsStore.js';

export type { ScheduledEmail } from './scheduledEmailsStore.js';

const SCHEDULED_PATH = path.resolve(process.cwd(), 'server', '.data', 'scheduled-emails.json');
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REVIEW_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const scheduledEmails: ScheduledEmail[] = [];
let persistQueue: Promise<void> = Promise.resolve();

function isScheduledEmail(value: unknown): value is ScheduledEmail {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.to === 'string' &&
    typeof obj.orderId === 'string' &&
    typeof obj.userName === 'string' &&
    typeof obj.scheduledAt === 'string' &&
    typeof obj.sent === 'boolean'
  );
}

function hydrateFromParsed(entries: ScheduledEmail[]): void {
  for (const entry of entries) {
    if (!isScheduledEmail(entry)) continue;
    scheduledEmails.push(entry);
  }
}

function hydrateSync(): void {
  const data = readJsonFile<ScheduledEmail[]>(SCHEDULED_PATH, []);
  hydrateFromParsed(data);
}

async function hydrateAsync(): Promise<void> {
  try {
    const data = await loadScheduledEmailsSnapshot(SCHEDULED_PATH);
    hydrateFromParsed(data);
  } catch (error) {
    logger.error('Failed to hydrate scheduled emails from Supabase, falling back to local.', {
      error: error instanceof Error ? error.message : String(error),
    });
    hydrateSync();
  }
}

function persist(): void {
  const snapshot = [...scheduledEmails];
  persistQueue = persistQueue
    .then(() => persistScheduledEmailsSnapshot(SCHEDULED_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist scheduled emails', { error: error instanceof Error ? error.message : String(error) });
    });
}

export function scheduleReviewRequestEmail(to: string, orderId: string, userName: string): void {
  // Avoid duplicate schedules for the same order
  const existing = scheduledEmails.find(e => e.orderId === orderId && e.type === 'review_request');
  if (existing) return;

  const scheduledAt = new Date(Date.now() + REVIEW_DELAY_MS).toISOString();
  scheduledEmails.push({
    id: randomBytes(16).toString('hex'),
    type: 'review_request',
    to,
    orderId,
    userName,
    scheduledAt,
    sent: false,
  });
  persist();
}

function cleanupSentEntries(): void {
  let i = 0;
  while (i < scheduledEmails.length) {
    if (scheduledEmails[i].sent) {
      scheduledEmails.splice(i, 1);
    } else {
      i++;
    }
  }
}

async function processScheduledEmails(): Promise<void> {
  const now = Date.now();
  let changed = false;

  for (let i = 0; i < scheduledEmails.length; i++) {
    const entry = scheduledEmails[i];
    if (entry.sent) continue;

    const scheduledTime = new Date(entry.scheduledAt).getTime();
    if (now < scheduledTime) continue;

    if (entry.type === 'review_request') {
      try {
        const sent = await sendReviewRequestEmail(entry.to, entry.orderId, entry.userName);
        if (sent) {
          scheduledEmails[i] = { ...entry, sent: true };
          changed = true;
          logger.info('Scheduled review request email sent', { orderId: entry.orderId });
        }
      } catch (error) {
        logger.error('Failed to process scheduled email', {
          id: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (changed) {
    cleanupSentEntries();
    persist();
  }
}

let checkerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduledEmailChecker(): void {
  if (checkerInterval) return;
  checkerInterval = setInterval(() => {
    processScheduledEmails().catch((error) => {
      logger.error('Scheduled email checker error', { error: error instanceof Error ? error.message : String(error) });
    });
  }, CHECK_INTERVAL_MS);
  checkerInterval.unref();
  logger.info('Scheduled email checker started');
}

export function stopScheduledEmailChecker(): void {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
    logger.info('Scheduled email checker stopped');
  }
}

const SCHEDULED_HYDRATION_TIMEOUT_MS = 15_000;

export const scheduledEmailsHydrationReady: Promise<void> = hasSupabaseConfig()
  ? Promise.race([
      hydrateAsync(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Scheduled emails hydration timed out')), SCHEDULED_HYDRATION_TIMEOUT_MS),
      ),
    ]).catch((error) => {
      logger.error('Scheduled emails async hydration failed or timed out.', {
        error: error instanceof Error ? error.message : String(error),
      });
    })
  : Promise.resolve(hydrateSync());
