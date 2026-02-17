/**
 * Credits persistence layer
 * Follows checkoutStateStore.ts pattern: Supabase-primary with local file fallback
 */

import { promises as fs } from 'fs';
import { config } from '../config.js';
import { logger } from './logger.js';
import {
  hasSupabaseConfig,
  selectRows,
  upsertRows,
  deleteOrphanedRows,
} from './supabaseClient.js';
import type { CreditBalance, CreditTransaction, PersistedCreditsState } from './creditTypes.js';

// ==================== Supabase Row Type Mappings ====================

interface SupabaseCreditBalanceRow {
  user_id: string;
  free_remaining: number;
  paid_remaining: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseCreditTransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  free_amount: number;
  paid_amount: number;
  balance_after_free: number;
  balance_after_paid: number;
  reference_id: string | null;
  description: string;
  created_at: string;
}

// ==================== Supabase ↔ Domain Converters ====================

function balanceRowToBalance(row: SupabaseCreditBalanceRow): CreditBalance {
  return {
    userId: row.user_id,
    freeRemaining: row.free_remaining,
    paidRemaining: row.paid_remaining,
    totalUsed: row.total_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function balanceToBalanceRow(balance: CreditBalance): SupabaseCreditBalanceRow {
  return {
    user_id: balance.userId,
    free_remaining: balance.freeRemaining,
    paid_remaining: balance.paidRemaining,
    total_used: balance.totalUsed,
    created_at: balance.createdAt,
    updated_at: balance.updatedAt,
  };
}

function transactionRowToTransaction(row: SupabaseCreditTransactionRow): CreditTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as CreditTransaction['type'],
    amount: row.amount,
    freeAmount: row.free_amount,
    paidAmount: row.paid_amount,
    balanceAfterFree: row.balance_after_free,
    balanceAfterPaid: row.balance_after_paid,
    referenceId: row.reference_id ?? undefined,
    description: row.description,
    createdAt: row.created_at,
  };
}

function transactionToTransactionRow(txn: CreditTransaction): SupabaseCreditTransactionRow {
  return {
    id: txn.id,
    user_id: txn.userId,
    type: txn.type,
    amount: txn.amount,
    free_amount: txn.freeAmount,
    paid_amount: txn.paidAmount,
    balance_after_free: txn.balanceAfterFree,
    balance_after_paid: txn.balanceAfterPaid,
    reference_id: txn.referenceId ?? null,
    description: txn.description,
    created_at: txn.createdAt,
  };
}

// ==================== Supabase Operations ====================

async function loadCreditsFromSupabase(): Promise<PersistedCreditsState | null> {
  if (!hasSupabaseConfig()) return null;

  try {
    const [balanceRows, transactionRows] = await Promise.all([
      selectRows<SupabaseCreditBalanceRow>(
        config.SUPABASE_CREDITS_TABLE,
        'user_id,free_remaining,paid_remaining,total_used,created_at,updated_at'
      ),
      selectRows<SupabaseCreditTransactionRow>(
        config.SUPABASE_CREDIT_TRANSACTIONS_TABLE,
        'id,user_id,type,amount,free_amount,paid_amount,balance_after_free,balance_after_paid,reference_id,description,created_at'
      ),
    ]);

    const balances = balanceRows.map(balanceRowToBalance);
    const transactions = transactionRows.map(transactionRowToTransaction);

    logger.info('Loaded credits from Supabase', {
      balances: balances.length,
      transactions: transactions.length,
    });

    return {
      version: 1,
      balances,
      transactions,
    };
  } catch (error) {
    logger.error('Failed to load credits from Supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function persistCreditsToSupabase(state: PersistedCreditsState): Promise<void> {
  if (!hasSupabaseConfig()) return;

  try {
    const balanceRows = state.balances.map(balanceToBalanceRow);
    const transactionRows = state.transactions.map(transactionToTransactionRow);

    const keepUserIds = state.balances.map(b => b.userId);

    // Upsert balances and delete orphans (balances can be updated)
    await Promise.all([
      upsertRows(config.SUPABASE_CREDITS_TABLE, balanceRows, 'user_id'),
      deleteOrphanedRows(config.SUPABASE_CREDITS_TABLE, 'user_id', keepUserIds),
    ]);

    // Transactions are append-only: only upsert new ones
    // Do NOT delete orphans for transactions (they are immutable audit log)
    if (transactionRows.length > 0) {
      await upsertRows(config.SUPABASE_CREDIT_TRANSACTIONS_TABLE, transactionRows, 'id');
    }

    logger.info('Persisted credits to Supabase', {
      balances: balanceRows.length,
      transactions: transactionRows.length,
    });
  } catch (error) {
    logger.error('Failed to persist credits to Supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ==================== Local File Operations ====================

async function loadCreditsFromFile(filePath: string): Promise<PersistedCreditsState | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data) as PersistedCreditsState;

    logger.info('Loaded credits from local file', {
      filePath,
      balances: parsed.balances.length,
      transactions: parsed.transactions.length,
    });

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist yet
    }
    logger.error('Failed to load credits from file', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function persistCreditsToFile(filePath: string, state: PersistedCreditsState): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
    logger.info('Persisted credits to local file', {
      filePath,
      balances: state.balances.length,
      transactions: state.transactions.length,
    });
  } catch (error) {
    logger.error('Failed to persist credits to file', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ==================== Public API ====================

/**
 * Load credit state snapshot: Supabase-primary, file-fallback
 */
export async function loadCreditsStateSnapshot(filePath: string): Promise<PersistedCreditsState> {
  // Try Supabase first
  const supabaseState = await loadCreditsFromSupabase();
  if (supabaseState) {
    return supabaseState;
  }

  // Fallback to local file
  const fileState = await loadCreditsFromFile(filePath);
  if (fileState) {
    return fileState;
  }

  // Default empty state
  logger.info('No existing credits data, starting fresh');
  return {
    version: 1,
    balances: [],
    transactions: [],
  };
}

/**
 * Persist credit state snapshot: Supabase-primary, file-fallback
 */
export async function persistCreditsStateSnapshot(
  filePath: string,
  state: PersistedCreditsState
): Promise<void> {
  // Try Supabase first
  if (hasSupabaseConfig()) {
    try {
      await persistCreditsToSupabase(state);
      // Also persist to file as backup
      await persistCreditsToFile(filePath, state);
      return;
    } catch (error) {
      logger.warn('Supabase persist failed, falling back to file only', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to file only
  await persistCreditsToFile(filePath, state);
}
