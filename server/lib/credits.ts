/**
 * Credit management system for TSUMUGI
 * Follows checkoutState.ts pattern: in-memory state with Supabase persistence
 */

import path from 'path';
import { config } from '../config.js';
import { logger } from './logger.js';
import { loadCreditsStateSnapshot, persistCreditsStateSnapshot } from './creditsStore.js';
import type {
  CreditBalance,
  CreditTransaction,
  PersistedCreditsState,
} from './creditTypes.js';
import { FREE_CREDITS } from './creditTypes.js';

// ==================== In-Memory State ====================

const balancesByUserId = new Map<string, CreditBalance>();
const transactionsByUserId = new Map<string, CreditTransaction[]>();
let persistQueue: Promise<void> = Promise.resolve();

// ==================== Persistence ====================

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'credits-state.json');

function createStateSnapshot(): PersistedCreditsState {
  const balances = Array.from(balancesByUserId.values());
  const allTransactions = Array.from(transactionsByUserId.values()).flat();

  return {
    version: 1,
    balances,
    transactions: allTransactions,
  };
}

function persistCreditsState(): void {
  const snapshot = createStateSnapshot();
  persistQueue = persistQueue.then(async () => {
    try {
      await persistCreditsStateSnapshot(STATE_FILE_PATH, snapshot);
    } catch (error) {
      logger.error('Failed to persist credits state', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// ==================== Hydration (Startup) ====================

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

    logger.info('Credits state hydrated', {
      users: balancesByUserId.size,
      transactions: snapshot.transactions.length,
    });
  } catch (error) {
    logger.error('Failed to hydrate credits state', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export const creditsHydrationReady = hydrateCreditsState();

// ==================== Helper Functions ====================

function createTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `txn_${timestamp}_${random}`;
}

function appendTransaction(userId: string, txn: CreditTransaction): void {
  const userTxns = transactionsByUserId.get(userId) ?? [];
  userTxns.push(txn);
  transactionsByUserId.set(userId, userTxns);
}

// ==================== Public API ====================

/**
 * Initialize balance for a new user (grants free credits)
 * Returns the newly created balance
 */
export function initializeUserCredits(userId: string): CreditBalance {
  const existing = balancesByUserId.get(userId);
  if (existing) {
    return existing; // Already initialized
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
  return newBalance;
}

/**
 * Get current balance for a user
 * Returns null if user has no credit record
 */
export function getUserCredits(userId: string): CreditBalance | null {
  return balancesByUserId.get(userId) ?? null;
}

/**
 * Check if user can generate (has free or paid credits)
 */
export function canGenerate(userId: string): boolean {
  const balance = balancesByUserId.get(userId);
  if (!balance) return false;
  return balance.freeRemaining > 0 || balance.paidRemaining > 0;
}

/**
 * Consume 1 credit: free first, then paid
 * Throws error if insufficient credits
 * Returns the transaction record
 */
export function consumeCredit(userId: string, referenceId: string): CreditTransaction {
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
 */
export function getUserTransactions(userId: string): CreditTransaction[] {
  return transactionsByUserId.get(userId) ?? [];
}

/**
 * Get all balances (for admin/debugging)
 */
export function getAllBalances(): CreditBalance[] {
  return Array.from(balancesByUserId.values());
}

/**
 * Get all transactions (for admin/debugging)
 */
export function getAllTransactions(): CreditTransaction[] {
  return Array.from(transactionsByUserId.values()).flat();
}
