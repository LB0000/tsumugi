import path from 'path';
import { randomBytes } from 'crypto';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';
import { sendReviewRequestEmail } from './email.js';

interface ScheduledEmail {
  id: string;
  type: 'review_request';
  to: string;
  orderId: string;
  userName: string;
  scheduledAt: string;
  sent: boolean;
}

const SCHEDULED_PATH = path.resolve(process.cwd(), 'server', '.data', 'scheduled-emails.json');
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REVIEW_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const scheduledEmails: ScheduledEmail[] = [];
let persistQueue: Promise<void> = Promise.resolve();

function hydrate(): void {
  const data = readJsonFile<ScheduledEmail[]>(SCHEDULED_PATH, []);
  for (const entry of data) {
    if (
      typeof entry.id === 'string' &&
      typeof entry.type === 'string' &&
      typeof entry.to === 'string' &&
      typeof entry.scheduledAt === 'string'
    ) {
      scheduledEmails.push(entry);
    }
  }
}

function persist(): void {
  const snapshot = [...scheduledEmails];
  persistQueue = persistQueue
    .then(() => writeJsonAtomic(SCHEDULED_PATH, snapshot))
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

  for (const entry of scheduledEmails) {
    if (entry.sent) continue;

    const scheduledTime = new Date(entry.scheduledAt).getTime();
    if (now < scheduledTime) continue;

    if (entry.type === 'review_request') {
      try {
        const sent = await sendReviewRequestEmail(entry.to, entry.orderId, entry.userName);
        if (sent) {
          entry.sent = true;
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

hydrate();
