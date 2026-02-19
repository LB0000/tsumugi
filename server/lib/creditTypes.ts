/**
 * Credit system type definitions for TSUMUGI
 * Follows immutable pattern per coding-style.md
 */

// ==================== Constants ====================

export const FREE_CREDITS = 3;
export const CREDITS_PER_PACK = 10;
export const PACK_PRICE_YEN = 980;
export const PRICE_PER_GENERATION = 98; // 980 / 10
export const MAX_CREDITS_PER_PURCHASE = 1000; // Maximum credits allowed in a single purchase
export const TEST_USER_DISPLAY_CREDITS = 999; // Display value for test users' unlimited credits

// ==================== Domain Types ====================

/**
 * Credit balance record - one per user
 * Immutable: create new instance for updates
 */
export interface CreditBalance {
  userId: string;
  freeRemaining: number;    // 0..FREE_CREDITS
  paidRemaining: number;    // 0..N, never expires
  totalUsed: number;        // lifetime total consumed
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

/**
 * Immutable transaction log entry
 * Append-only audit trail
 */
export interface CreditTransaction {
  id: string;               // txn_<timestamp>_<random>
  userId: string;
  type: 'grant_free' | 'purchase' | 'consume' | 'refund';
  amount: number;           // positive for additions, negative for deductions
  freeAmount: number;       // how much was free-credit in this txn
  paidAmount: number;       // how much was paid-credit in this txn
  balanceAfterFree: number; // snapshot after txn
  balanceAfterPaid: number; // snapshot after txn
  referenceId?: string;     // orderId, paymentId, or projectId
  description: string;      // human-readable
  createdAt: string;        // ISO 8601
}

// ==================== Persistence Types ====================

/**
 * Pending payment tracking for webhook processing
 */
export interface PendingPayment {
  userId: string;
  credits: number;
  createdAt: string;
}

/**
 * Persisted webhook event record for idempotency
 */
export interface ProcessedWebhookEvent {
  eventId: string;
  processedAt: string;
}

/**
 * Complete snapshot of credit system state
 * Used for persistence (Supabase + local file fallback)
 */
export interface PersistedCreditsState {
  version: number;
  balances: CreditBalance[];
  transactions: CreditTransaction[];
  processedWebhookEvents: ProcessedWebhookEvent[];
  pendingPayments: { paymentId: string; payment: PendingPayment }[];
}
