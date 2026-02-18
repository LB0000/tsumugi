/**
 * Credit management system for TSUMUGI
 * Follows checkoutState.ts pattern: in-memory state with Supabase persistence
 */

import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { logger } from './logger.js';
import { loadCreditsStateSnapshot, persistCreditsStateSnapshot } from './creditsStore.js';
import type {
  CreditBalance,
  CreditTransaction,
  PersistedCreditsState,
  PendingPayment,
  ProcessedWebhookEvent,
} from './creditTypes.js';
import { FREE_CREDITS, MAX_CREDITS_PER_PURCHASE } from './creditTypes.js';

// ==================== Test User Bypass ====================

const testUserIds: ReadonlySet<string> = new Set(
  (config.TEST_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
);

/**
 * Check if a userId is a test user (unlimited credits, no consumption)
 */
export function isTestUser(userId: string): boolean {
  return testUserIds.has(userId);
}

// ==================== In-Memory State ====================

const balancesByUserId = new Map<string, CreditBalance>();
const transactionsByUserId = new Map<string, CreditTransaction[]>();
let persistQueue: Promise<void> = Promise.resolve();

// Track new transactions since last persist for delta persistence
const newTransactionsSinceLastPersist: CreditTransaction[] = [];

// Webhook event deduplication (event_id tracking)
// HIGH-1 FIX: TTL cleanup added below to prevent unbounded growth
const processedWebhookEvents = new Map<string, ProcessedWebhookEvent>();

// Payment tracking for webhook processing (paymentId -> userId + credits)
// HIGH-1 FIX: TTL cleanup added below to prevent unbounded growth
const pendingPaymentsByPaymentId = new Map<string, PendingPayment>();

// ==================== Persistence ====================

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'credits-state.json');

function createStateSnapshot(): PersistedCreditsState {
  const balances = Array.from(balancesByUserId.values());
  const allTransactions = Array.from(transactionsByUserId.values()).flat();
  const webhookEvents = Array.from(processedWebhookEvents.values());
  const pendingPayments = Array.from(pendingPaymentsByPaymentId.entries()).map(
    ([paymentId, payment]) => ({ paymentId, payment })
  );

  return {
    version: 1,
    balances,
    transactions: allTransactions,
    processedWebhookEvents: webhookEvents,
    pendingPayments,
  };
}

// Supabase向けスナップショット: トランザクションはデルタ（新規分のみ）、他はフルステート
function createSupabaseSnapshot(): PersistedCreditsState {
  const balances = Array.from(balancesByUserId.values());
  const webhookEvents = Array.from(processedWebhookEvents.values());
  const pendingPayments = Array.from(pendingPaymentsByPaymentId.entries()).map(
    ([paymentId, payment]) => ({ paymentId, payment })
  );

  return {
    version: 1,
    balances,
    transactions: newTransactionsSinceLastPersist,
    processedWebhookEvents: webhookEvents,
    pendingPayments,
  };
}

function persistCreditsState(): void {
  const deltaSnapshot = createSupabaseSnapshot();
  const fullSnapshot = createStateSnapshot();
  const transactionCount = newTransactionsSinceLastPersist.length;

  persistQueue = persistQueue.then(async () => {
    try {
      // Supabase: delta only (append-only), File: full snapshot (for recovery)
      await persistCreditsStateSnapshot(STATE_FILE_PATH, deltaSnapshot, fullSnapshot);
      // Clear delta after successful persist
      newTransactionsSinceLastPersist.length = 0;

      if (transactionCount > 0) {
        logger.info('Persisted credits delta', { newTransactions: transactionCount });
      }
    } catch (error) {
      logger.error('Failed to persist credits state', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// ==================== Hydration (Startup) ====================

const CREDITS_HYDRATION_TIMEOUT_MS = 15_000;

async function hydrateCreditsState(): Promise<void> {
  try {
    const snapshot = await loadCreditsStateSnapshot(STATE_FILE_PATH);

    // Load balances
    for (const balance of snapshot.balances) {
      balancesByUserId.set(balance.userId, balance);
    }

    // Load transactions
    for (const txn of snapshot.transactions) {
      const userTxns = transactionsByUserId.get(txn.userId) ?? [];
      userTxns.push(txn);
      transactionsByUserId.set(txn.userId, userTxns);
    }

    // CRITICAL-1 FIX: Load webhook state to restore idempotency tracking
    for (const event of snapshot.processedWebhookEvents ?? []) {
      processedWebhookEvents.set(event.eventId, event);
    }

    // CRITICAL-1 FIX: Load pending payments to resume webhook processing
    for (const { paymentId, payment } of snapshot.pendingPayments ?? []) {
      pendingPaymentsByPaymentId.set(paymentId, payment);
    }

    // Clear delta tracker after hydration (all transactions are already persisted)
    newTransactionsSinceLastPersist.length = 0;

    logger.info('Credits state hydrated', {
      users: balancesByUserId.size,
      transactions: snapshot.transactions.length,
      webhookEvents: processedWebhookEvents.size,
      pendingPayments: pendingPaymentsByPaymentId.size,
    });
  } catch (error) {
    logger.error('Failed to hydrate credits state', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function hydrateWithTimeout(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<void>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Credits hydration timeout')),
      CREDITS_HYDRATION_TIMEOUT_MS
    );
  });

  try {
    await Promise.race([hydrateCreditsState(), timeoutPromise]);
  } catch (error) {
    logger.error('Credits hydration failed or timed out', {
      error: error instanceof Error ? error.message : String(error),
      timeout: CREDITS_HYDRATION_TIMEOUT_MS,
    });
    // Continue with empty state rather than blocking server startup
    logger.warn('Starting with empty credits state');
  } finally {
    clearTimeout(timeoutId!);
  }
}

export const creditsHydrationReady = hydrateWithTimeout();

// ==================== TTL-Based Cleanup ====================

const WEBHOOK_EVENT_TTL_MS = 24 * 60 * 60 * 1000; // HIGH-1 FIX: 24 hours
const PENDING_PAYMENT_TTL_MS = 2 * 60 * 60 * 1000; // HIGH-1 FIX: 2 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run cleanup every hour

/**
 * HIGH-1 FIX: Clean up old webhook events and pending payments to prevent unbounded memory growth
 */
function cleanupExpiredWebhookState(): void {
  const now = Date.now();
  let webhookEventsRemoved = 0;
  let pendingPaymentsRemoved = 0;

  // Clean up old webhook events (>24h)
  for (const [eventId, event] of processedWebhookEvents.entries()) {
    const eventAge = now - new Date(event.processedAt).getTime();
    if (eventAge > WEBHOOK_EVENT_TTL_MS) {
      processedWebhookEvents.delete(eventId);
      webhookEventsRemoved++;
    }
  }

  // Clean up old pending payments (>2h)
  for (const [paymentId, payment] of pendingPaymentsByPaymentId.entries()) {
    const paymentAge = now - new Date(payment.createdAt).getTime();
    if (paymentAge > PENDING_PAYMENT_TTL_MS) {
      pendingPaymentsByPaymentId.delete(paymentId);
      pendingPaymentsRemoved++;
      logger.warn('Pending payment expired (TTL exceeded)', {
        paymentId,
        userId: payment.userId,
        credits: payment.credits,
        ageHours: (paymentAge / (60 * 60 * 1000)).toFixed(1),
      });
    }
  }

  if (webhookEventsRemoved > 0 || pendingPaymentsRemoved > 0) {
    logger.info('Webhook state cleanup completed', {
      webhookEventsRemoved,
      pendingPaymentsRemoved,
      webhookEventsRemaining: processedWebhookEvents.size,
      pendingPaymentsRemaining: pendingPaymentsByPaymentId.size,
    });
    // Persist after cleanup
    persistCreditsState();
  }
}

// Start cleanup interval after hydration
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
creditsHydrationReady.then(() => {
  cleanupIntervalId = setInterval(cleanupExpiredWebhookState, CLEANUP_INTERVAL_MS);
  logger.info('Webhook state cleanup interval started', {
    webhookEventTtlHours: WEBHOOK_EVENT_TTL_MS / (60 * 60 * 1000),
    pendingPaymentTtlHours: PENDING_PAYMENT_TTL_MS / (60 * 60 * 1000),
    cleanupIntervalMinutes: CLEANUP_INTERVAL_MS / (60 * 1000),
  });
});

/**
 * Stop the cleanup interval for graceful shutdown
 */
export function stopCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info('Webhook state cleanup interval stopped');
  }
}

// ==================== Helper Functions ====================

function createTransactionId(): string {
  return `txn_${randomUUID()}`;
}

function appendTransaction(userId: string, txn: CreditTransaction): void {
  const userTxns = transactionsByUserId.get(userId) ?? [];
  userTxns.push(txn);
  transactionsByUserId.set(userId, userTxns);

  // Track for delta persistence
  newTransactionsSinceLastPersist.push(txn);
}

// ==================== Public API ====================

/**
 * Initialize balance for a new user (grants free credits)
 * Returns a copy of the newly created balance
 */
export function initializeUserCredits(userId: string): CreditBalance {
  const existing = balancesByUserId.get(userId);
  if (existing) {
    return { ...existing }; // Already initialized, return copy
  }

  const now = new Date().toISOString();
  const newBalance: CreditBalance = {
    userId,
    freeRemaining: FREE_CREDITS,
    paidRemaining: 0,
    totalUsed: 0,
    createdAt: now,
    updatedAt: now,
  };

  const txn: CreditTransaction = {
    id: createTransactionId(),
    userId,
    type: 'grant_free',
    amount: FREE_CREDITS,
    freeAmount: FREE_CREDITS,
    paidAmount: 0,
    balanceAfterFree: FREE_CREDITS,
    balanceAfterPaid: 0,
    description: '新規ユーザー：無料3回付与',
    createdAt: now,
  };

  balancesByUserId.set(userId, newBalance);
  appendTransaction(userId, txn);
  persistCreditsState();

  logger.info('User credits initialized', { userId, freeCredits: FREE_CREDITS });
  return { ...newBalance }; // Return copy to prevent external mutation
}

/**
 * Get current balance for a user
 * Returns null if user has no credit record
 * Returns a copy to prevent external mutation
 */
export function getUserCredits(userId: string): CreditBalance | null {
  const balance = balancesByUserId.get(userId);
  return balance ? { ...balance } : null;
}

/**
 * Check if user can generate (has free or paid credits)
 * Test users always return true
 */
export function canGenerate(userId: string): boolean {
  if (isTestUser(userId)) return true;
  const balance = balancesByUserId.get(userId);
  if (!balance) return false;
  return balance.freeRemaining > 0 || balance.paidRemaining > 0;
}

/**
 * Consume 1 credit: free first, then paid
 * Throws error if insufficient credits
 * Test users skip actual consumption
 * Returns the transaction record
 */
export function consumeCredit(userId: string, referenceId: string): CreditTransaction {
  // Test users: no actual credit deduction
  if (isTestUser(userId)) {
    logger.info('Test user credit bypass', { userId, referenceId });
    return {
      id: createTransactionId(),
      userId,
      type: 'consume',
      amount: 0,
      freeAmount: 0,
      paidAmount: 0,
      balanceAfterFree: Infinity,
      balanceAfterPaid: Infinity,
      referenceId,
      description: 'テストユーザー（クレジット消費なし）',
      createdAt: new Date().toISOString(),
    };
  }

  const balance = balancesByUserId.get(userId);
  if (!balance) {
    throw new Error('NO_CREDIT_BALANCE');
  }

  const total = balance.freeRemaining + balance.paidRemaining;
  if (total <= 0) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // Credit consumption order: free first, then paid
  // Explicit assignment to avoid JavaScript -0 issues
  let freeUsed: number;
  let paidUsed: number;
  let freeAmountForTxn: number;
  let paidAmountForTxn: number;

  if (balance.freeRemaining > 0) {
    freeUsed = 1;
    paidUsed = 0;
    freeAmountForTxn = -1;
    paidAmountForTxn = 0;
  } else {
    freeUsed = 0;
    paidUsed = 1;
    freeAmountForTxn = 0;
    paidAmountForTxn = -1;
  }

  // Create NEW balance (immutable pattern per coding-style.md)
  const updatedBalance: CreditBalance = {
    ...balance,
    freeRemaining: balance.freeRemaining - freeUsed,
    paidRemaining: balance.paidRemaining - paidUsed,
    totalUsed: balance.totalUsed + 1,
    updatedAt: new Date().toISOString(),
  };

  // Record transaction (negative values for consumption)
  const txn: CreditTransaction = {
    id: createTransactionId(),
    userId,
    type: 'consume',
    amount: -1,
    freeAmount: freeAmountForTxn,
    paidAmount: paidAmountForTxn,
    balanceAfterFree: updatedBalance.freeRemaining,
    balanceAfterPaid: updatedBalance.paidRemaining,
    referenceId,
    description: freeUsed > 0 ? '無料枠で画像生成' : '有料クレジットで画像生成',
    createdAt: new Date().toISOString(),
  };

  balancesByUserId.set(userId, updatedBalance);
  appendTransaction(userId, txn);
  persistCreditsState();

  logger.info('Credit consumed', {
    userId,
    freeUsed,
    paidUsed,
    remaining: updatedBalance.freeRemaining + updatedBalance.paidRemaining,
    referenceId,
  });

  return txn;
}

/**
 * Add purchased credits after successful payment
 * Idempotent: if referenceId already exists, returns existing transaction
 * Returns the transaction record
 */
export function addPurchasedCredits(
  userId: string,
  amount: number,
  referenceId: string
): CreditTransaction {
  // Input validation
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_CREDITS_PER_PURCHASE) {
    throw new Error('INVALID_CREDIT_AMOUNT');
  }

  // Idempotency check: if a purchase transaction with this referenceId exists, return it
  const existingTxns = transactionsByUserId.get(userId) ?? [];
  const duplicate = existingTxns.find(
    txn => txn.type === 'purchase' && txn.referenceId === referenceId
  );
  if (duplicate) {
    logger.info('Duplicate credit purchase detected, returning existing transaction', {
      userId,
      referenceId,
      transactionId: duplicate.id,
    });
    return duplicate;
  }

  // Get or initialize balance
  let balance = balancesByUserId.get(userId);
  if (!balance) {
    // Initialize user if they don't have a balance yet
    balance = initializeUserCredits(userId);
  }

  // Create NEW balance (immutable)
  const updatedBalance: CreditBalance = {
    ...balance,
    paidRemaining: balance.paidRemaining + amount,
    updatedAt: new Date().toISOString(),
  };

  // Record transaction
  const txn: CreditTransaction = {
    id: createTransactionId(),
    userId,
    type: 'purchase',
    amount,
    freeAmount: 0,
    paidAmount: amount,
    balanceAfterFree: updatedBalance.freeRemaining,
    balanceAfterPaid: updatedBalance.paidRemaining,
    referenceId,
    description: `クレジット購入: ${amount}回分`,
    createdAt: new Date().toISOString(),
  };

  balancesByUserId.set(userId, updatedBalance);
  appendTransaction(userId, txn);
  persistCreditsState();

  logger.info('Credits purchased', {
    userId,
    amount,
    newPaidBalance: updatedBalance.paidRemaining,
    referenceId,
  });

  return txn;
}

/**
 * Get transaction history for a user
 * Returns empty array if user has no transactions
 * Returns a shallow copy to prevent external mutation
 */
export function getUserTransactions(userId: string): CreditTransaction[] {
  return [...(transactionsByUserId.get(userId) ?? [])];
}

/**
 * Get all balances (admin-only: do NOT expose via unauthenticated endpoints)
 * Returns a shallow copy to prevent external mutation
 */
export function getAllBalances(): CreditBalance[] {
  return Array.from(balancesByUserId.values()).map(b => ({ ...b }));
}

/**
 * Get all transactions (admin-only: do NOT expose via unauthenticated endpoints)
 * Returns a shallow copy to prevent external mutation
 */
export function getAllTransactions(): CreditTransaction[] {
  return Array.from(transactionsByUserId.values()).flat().map(t => ({ ...t }));
}

/**
 * Check if a webhook event has already been processed (idempotency)
 */
export function hasProcessedWebhookEvent(eventId: string): boolean {
  // HIGH-2 FIX: Handle empty eventId defensively
  if (!eventId || eventId.trim() === '') {
    logger.warn('hasProcessedWebhookEvent called with empty eventId');
    return false;
  }
  return processedWebhookEvents.has(eventId);
}

/**
 * Mark a webhook event as processed (idempotency)
 */
export function markWebhookEventProcessed(eventId: string): void {
  // HIGH-2 FIX: Handle empty eventId defensively
  if (!eventId || eventId.trim() === '') {
    logger.warn('markWebhookEventProcessed called with empty eventId, skipping');
    return;
  }

  const event: ProcessedWebhookEvent = {
    eventId,
    processedAt: new Date().toISOString(),
  };
  processedWebhookEvents.set(eventId, event);

  // CRITICAL-1 FIX: Persist webhook state after marking event
  persistCreditsState();
}

/**
 * Track a pending payment for webhook processing
 * Called when a payment is created but not yet completed
 */
export function trackPendingPayment(paymentId: string, userId: string, credits: number): void {
  pendingPaymentsByPaymentId.set(paymentId, {
    userId,
    credits,
    createdAt: new Date().toISOString(),
  });

  // CRITICAL-1 FIX: Persist pending payment immediately
  persistCreditsState();

  logger.info('Pending payment tracked', { paymentId, userId, credits });
}

/**
 * Get pending payment info for webhook processing
 * Returns userId and credits if payment is tracked
 */
export function getPendingPayment(paymentId: string): PendingPayment | null {
  const p = pendingPaymentsByPaymentId.get(paymentId);
  return p ? { ...p } : null;
}

/**
 * Remove payment from pending tracker (after completion or timeout)
 */
export function clearPendingPayment(paymentId: string): void {
  const existed = pendingPaymentsByPaymentId.delete(paymentId);

  if (existed) {
    // CRITICAL-1 FIX: Persist state after clearing pending payment
    persistCreditsState();
    logger.info('Pending payment cleared', { paymentId });
  }
}
