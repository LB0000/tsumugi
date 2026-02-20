/**
 * Credits persistence layer
 * Follows checkoutStateStore.ts pattern: Supabase-primary with local file fallback
 */

import { config } from '../config.js';
import { logger } from './logger.js';
import { writeJsonAtomic, readJsonFile } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  upsertRows,
  deleteOrphanedRows,
  deleteRowsOlderThan,
} from './supabaseClient.js';
import type {
  CreditBalance,
  CreditTransaction,
  PersistedCreditsState,
  ProcessedWebhookEvent,
  PendingPayment,
} from './creditTypes.js';

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

// CRITICAL-1 FIX: Webhook state row types
interface SupabaseProcessedWebhookEventRow {
  event_id: string;
  processed_at: string;
  created_at: string;
}

interface SupabasePendingPaymentRow {
  payment_id: string;
  user_id: string;
  credits: number;
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

// CRITICAL-1 FIX: Webhook state converters
function webhookEventRowToWebhookEvent(row: SupabaseProcessedWebhookEventRow): ProcessedWebhookEvent {
  return {
    eventId: row.event_id,
    processedAt: row.processed_at,
  };
}

function webhookEventToWebhookEventRow(event: ProcessedWebhookEvent): SupabaseProcessedWebhookEventRow {
  return {
    event_id: event.eventId,
    processed_at: event.processedAt,
    created_at: event.processedAt, // Use processedAt as createdAt
  };
}

function pendingPaymentRowToPendingPayment(
  row: SupabasePendingPaymentRow
): { paymentId: string; payment: PendingPayment } {
  return {
    paymentId: row.payment_id,
    payment: {
      userId: row.user_id,
      credits: row.credits,
      createdAt: row.created_at,
    },
  };
}

function pendingPaymentToPendingPaymentRow(
  paymentId: string,
  payment: PendingPayment
): SupabasePendingPaymentRow {
  return {
    payment_id: paymentId,
    user_id: payment.userId,
    credits: payment.credits,
    created_at: payment.createdAt,
  };
}

// ==================== Supabase Operations ====================

async function loadCreditsFromSupabase(): Promise<PersistedCreditsState | null> {
  if (!hasSupabaseConfig()) return null;

  try {
    const [balanceRows, transactionRows, webhookEventRows, pendingPaymentRows] = await Promise.all([
      selectRows<SupabaseCreditBalanceRow>(
        config.SUPABASE_CREDITS_TABLE,
        'user_id,free_remaining,paid_remaining,total_used,created_at,updated_at'
      ),
      selectRows<SupabaseCreditTransactionRow>(
        config.SUPABASE_CREDIT_TRANSACTIONS_TABLE,
        'id,user_id,type,amount,free_amount,paid_amount,balance_after_free,balance_after_paid,reference_id,description,created_at'
      ),
      // CRITICAL-1 FIX: Load webhook state
      selectRows<SupabaseProcessedWebhookEventRow>(
        config.SUPABASE_PROCESSED_WEBHOOK_EVENTS_TABLE,
        'event_id,processed_at,created_at'
      ),
      selectRows<SupabasePendingPaymentRow>(
        config.SUPABASE_PENDING_PAYMENTS_TABLE,
        'payment_id,user_id,credits,created_at'
      ),
    ]);

    const balances = balanceRows.map(balanceRowToBalance);
    const transactions = transactionRows.map(transactionRowToTransaction);
    const processedWebhookEvents = webhookEventRows.map(webhookEventRowToWebhookEvent);
    const pendingPayments = pendingPaymentRows.map(pendingPaymentRowToPendingPayment);

    logger.info('Loaded credits from Supabase', {
      balances: balances.length,
      transactions: transactions.length,
      webhookEvents: processedWebhookEvents.length,
      pendingPayments: pendingPayments.length,
    });

    return {
      version: 1,
      balances,
      transactions,
      processedWebhookEvents,
      pendingPayments,
    };
  } catch (error) {
    logger.error('Failed to load credits from Supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function deleteOrphansQuietly(table: string, keyColumn: string, keepKeys: string[]): Promise<void> {
  try {
    await deleteOrphanedRows(table, keyColumn, keepKeys);
  } catch (error) {
    // Orphan deletion is best-effort: upsert already ensured correct data exists.
    // Stale rows will be cleaned up on the next successful persist cycle.
    logger.warn('Orphan deletion failed (non-fatal)', {
      table,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function persistCreditsToSupabase(state: PersistedCreditsState): Promise<void> {
  if (!hasSupabaseConfig()) return;

  try {
    const balanceRows = state.balances.map(balanceToBalanceRow);
    const transactionRows = state.transactions.map(transactionToTransactionRow);
    const webhookEventRows = state.processedWebhookEvents.map(webhookEventToWebhookEventRow);
    const pendingPaymentRows = state.pendingPayments.map(({ paymentId, payment }) =>
      pendingPaymentToPendingPaymentRow(paymentId, payment)
    );

    // Step 1: Upsert all current data (critical — ensures correct rows exist)
    await Promise.all([
      upsertRows(config.SUPABASE_CREDITS_TABLE, balanceRows, 'user_id'),
      transactionRows.length > 0
        ? upsertRows(config.SUPABASE_CREDIT_TRANSACTIONS_TABLE, transactionRows, 'id')
        : Promise.resolve(),
      webhookEventRows.length > 0
        ? upsertRows(config.SUPABASE_PROCESSED_WEBHOOK_EVENTS_TABLE, webhookEventRows, 'event_id')
        : Promise.resolve(),
      pendingPaymentRows.length > 0
        ? upsertRows(config.SUPABASE_PENDING_PAYMENTS_TABLE, pendingPaymentRows, 'payment_id')
        : Promise.resolve(),
    ]);

    // Step 2: Delete orphaned rows (best-effort — failure leaves stale rows but no data loss)
    // Transactions are append-only audit log: never delete orphans
    await Promise.all([
      deleteOrphansQuietly(config.SUPABASE_CREDITS_TABLE, 'user_id', state.balances.map(b => b.userId)),
      deleteOrphansQuietly(config.SUPABASE_PROCESSED_WEBHOOK_EVENTS_TABLE, 'event_id', state.processedWebhookEvents.map(e => e.eventId)),
      deleteOrphansQuietly(config.SUPABASE_PENDING_PAYMENTS_TABLE, 'payment_id', state.pendingPayments.map(p => p.paymentId)),
    ]);

    logger.info('Persisted credits to Supabase', {
      balances: balanceRows.length,
      transactions: transactionRows.length,
      webhookEvents: webhookEventRows.length,
      pendingPayments: pendingPaymentRows.length,
    });
  } catch (error) {
    logger.error('Failed to persist credits to Supabase', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ==================== Local File Operations ====================

function loadCreditsFromFile(filePath: string): PersistedCreditsState | null {
  const EMPTY: PersistedCreditsState = { version: 1, balances: [], transactions: [], processedWebhookEvents: [], pendingPayments: [] };
  const parsed = readJsonFile<PersistedCreditsState>(filePath, EMPTY);

  // Empty file / fresh start
  if (parsed.balances.length === 0 && parsed.transactions.length === 0) {
    return null;
  }

  // CRITICAL-1 FIX: Backward compatibility for old files without webhook state
  const state: PersistedCreditsState = {
    version: parsed.version,
    balances: parsed.balances,
    transactions: parsed.transactions,
    processedWebhookEvents: parsed.processedWebhookEvents ?? [],
    pendingPayments: parsed.pendingPayments ?? [],
  };

  logger.info('Loaded credits from local file', {
    filePath,
    balances: state.balances.length,
    transactions: state.transactions.length,
    webhookEvents: state.processedWebhookEvents.length,
    pendingPayments: state.pendingPayments.length,
  });

  return state;
}

async function persistCreditsToFile(filePath: string, state: PersistedCreditsState): Promise<void> {
  try {
    await writeJsonAtomic(filePath, state);
    logger.info('Persisted credits to local file', {
      filePath,
      balances: state.balances.length,
      transactions: state.transactions.length,
      webhookEvents: state.processedWebhookEvents.length,
      pendingPayments: state.pendingPayments.length,
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
  const fileState = loadCreditsFromFile(filePath);
  if (fileState) {
    return fileState;
  }

  // Default empty state
  logger.info('No existing credits data, starting fresh');
  return {
    version: 1,
    balances: [],
    transactions: [],
    processedWebhookEvents: [],
    pendingPayments: [],
  };
}

/**
 * Persist credit state snapshot: Supabase-primary, file-fallback
 * Accepts separate snapshots for Supabase (delta) and file (full)
 */
export async function persistCreditsStateSnapshot(
  filePath: string,
  supabaseState: PersistedCreditsState,
  fileState?: PersistedCreditsState
): Promise<void> {
  const stateForFile = fileState ?? supabaseState;

  // Try Supabase first
  if (hasSupabaseConfig()) {
    try {
      await persistCreditsToSupabase(supabaseState);
      // Persist full state to file as backup
      await persistCreditsToFile(filePath, stateForFile);
      return;
    } catch (error) {
      logger.warn('Supabase persist failed, falling back to file only', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to file only (always use full state)
  await persistCreditsToFile(filePath, stateForFile);
}

/**
 * Delete expired rows directly from Supabase tables.
 * Called during startup cleanup to purge stale data that may have accumulated
 * if the server crashed before in-memory cleanup could persist.
 */
export async function cleanupExpiredRowsInSupabase(
  webhookEventTtlMs: number,
  pendingPaymentTtlMs: number
): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const now = Date.now();
  const webhookCutoff = new Date(now - webhookEventTtlMs).toISOString();
  const paymentCutoff = new Date(now - pendingPaymentTtlMs).toISOString();

  try {
    await Promise.all([
      deleteRowsOlderThan(config.SUPABASE_PROCESSED_WEBHOOK_EVENTS_TABLE, 'processed_at', webhookCutoff),
      deleteRowsOlderThan(config.SUPABASE_PENDING_PAYMENTS_TABLE, 'created_at', paymentCutoff),
    ]);
    logger.info('Supabase TTL cleanup completed', {
      webhookCutoff,
      paymentCutoff,
    });
  } catch (error) {
    logger.warn('Supabase TTL cleanup failed (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
