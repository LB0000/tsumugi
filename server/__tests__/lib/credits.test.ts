/**
 * Unit tests for credit management system
 * Following TDD approach per CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeUserCredits,
  getUserCredits,
  canGenerate,
  consumeCredit,
  addPurchasedCredits,
  getUserTransactions,
  getAllBalances,
} from '../../lib/credits.js';
import { FREE_CREDITS, CREDITS_PER_PACK, MAX_CREDITS_PER_PURCHASE } from '../../lib/creditTypes.js';

// Mock persistence layer
vi.mock('../../lib/creditsStore.js', () => ({
  loadCreditsStateSnapshot: vi.fn(async () => ({
    version: 1,
    balances: [],
    transactions: [],
  })),
  persistCreditsStateSnapshot: vi.fn(async () => {}),
}));

// Mock logger
vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Credit Management System', () => {
  // Helper to generate unique user IDs per test
  let testCounter = 0;
  const createTestUserId = () => `user_test_${++testCounter}`;
  const testProjectId = 'proj_test_456';
  const testPaymentId = 'pay_test_789';

  describe('initializeUserCredits', () => {
    it('should create balance with FREE_CREDITS free credits', () => {
      const testUserId = createTestUserId();
      const balance = initializeUserCredits(testUserId);

      expect(balance.userId).toBe(testUserId);
      expect(balance.freeRemaining).toBe(FREE_CREDITS);
      expect(balance.paidRemaining).toBe(0);
      expect(balance.totalUsed).toBe(0);
      expect(balance.createdAt).toBeDefined();
      expect(balance.updatedAt).toBeDefined();
    });

    it('should record grant_free transaction', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      const transactions = getUserTransactions(testUserId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('grant_free');
      expect(transactions[0].amount).toBe(FREE_CREDITS);
      expect(transactions[0].freeAmount).toBe(FREE_CREDITS);
      expect(transactions[0].paidAmount).toBe(0);
      expect(transactions[0].description).toContain('新規ユーザー');
    });

    it('should be idempotent (returns existing balance)', () => {
      const testUserId = createTestUserId();
      const balance1 = initializeUserCredits(testUserId);
      const balance2 = initializeUserCredits(testUserId);

      expect(balance1).toEqual(balance2);
      const transactions = getUserTransactions(testUserId);
      expect(transactions).toHaveLength(1); // Only one grant transaction
    });
  });

  describe('getUserCredits', () => {
    it('should return null for unknown user', () => {
      const balance = getUserCredits('unknown_user');
      expect(balance).toBeNull();
    });

    it('should return balance for known user', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      const balance = getUserCredits(testUserId);

      expect(balance).not.toBeNull();
      expect(balance?.userId).toBe(testUserId);
    });
  });

  describe('canGenerate', () => {
    it('should return true when free credits > 0', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      expect(canGenerate(testUserId)).toBe(true);
    });

    it('should return true when paid credits > 0', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      // Consume all free credits
      consumeCredit(testUserId, 'ref1');
      consumeCredit(testUserId, 'ref2');
      consumeCredit(testUserId, 'ref3');

      // Add paid credits
      addPurchasedCredits(testUserId, CREDITS_PER_PACK, testPaymentId);

      expect(canGenerate(testUserId)).toBe(true);
    });

    it('should return false when both free and paid are 0', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      // Consume all free credits
      consumeCredit(testUserId, 'ref1');
      consumeCredit(testUserId, 'ref2');
      consumeCredit(testUserId, 'ref3');

      expect(canGenerate(testUserId)).toBe(false);
    });

    it('should return false for unknown user', () => {
      expect(canGenerate('unknown_user')).toBe(false);
    });
  });

  describe('consumeCredit', () => {
    it('should consume free credit first', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      const txn = consumeCredit(testUserId, testProjectId);

      expect(txn.type).toBe('consume');
      expect(txn.amount).toBe(-1);
      expect(txn.freeAmount).toBe(-1);
      expect(txn.paidAmount).toBe(0);
      expect(txn.balanceAfterFree).toBe(FREE_CREDITS - 1);
      expect(txn.balanceAfterPaid).toBe(0);
      expect(txn.description).toContain('無料枠');

      const balance = getUserCredits(testUserId);
      expect(balance?.freeRemaining).toBe(FREE_CREDITS - 1);
      expect(balance?.paidRemaining).toBe(0);
      expect(balance?.totalUsed).toBe(1);
    });

    it('should consume paid credit when free exhausted', () => {
      const userId = 'user_paid_test';
      initializeUserCredits(userId);

      // Consume all free credits
      consumeCredit(userId, 'ref1');
      consumeCredit(userId, 'ref2');
      consumeCredit(userId, 'ref3');

      // Add paid credits
      addPurchasedCredits(userId, CREDITS_PER_PACK, testPaymentId);

      // Consume one paid credit
      const txn = consumeCredit(userId, testProjectId);

      expect(txn.freeAmount).toBe(0);
      expect(txn.paidAmount).toBe(-1);
      expect(txn.balanceAfterFree).toBe(0);
      expect(txn.balanceAfterPaid).toBe(CREDITS_PER_PACK - 1);
      expect(txn.description).toContain('有料クレジット');

      const balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(0);
      expect(balance?.paidRemaining).toBe(CREDITS_PER_PACK - 1);
      expect(balance?.totalUsed).toBe(4); // 3 free + 1 paid
    });

    it('should throw INSUFFICIENT_CREDITS when both are 0', () => {
      const userId = 'user_depleted';
      initializeUserCredits(userId);

      // Consume all free credits
      consumeCredit(userId, 'ref1');
      consumeCredit(userId, 'ref2');
      consumeCredit(userId, 'ref3');

      expect(() => consumeCredit(userId, 'ref4')).toThrow('INSUFFICIENT_CREDITS');
    });

    it('should throw NO_CREDIT_BALANCE for unknown user', () => {
      expect(() => consumeCredit('unknown_user', testProjectId)).toThrow('NO_CREDIT_BALANCE');
    });

    it('should record referenceId in transaction', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      const txn = consumeCredit(testUserId, testProjectId);

      expect(txn.referenceId).toBe(testProjectId);
    });
  });

  describe('addPurchasedCredits', () => {
    it('should throw INVALID_CREDIT_AMOUNT for negative amount', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);

      expect(() => addPurchasedCredits(testUserId, -10, testPaymentId)).toThrow('INVALID_CREDIT_AMOUNT');
    });

    it('should throw INVALID_CREDIT_AMOUNT for zero amount', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);

      expect(() => addPurchasedCredits(testUserId, 0, testPaymentId)).toThrow('INVALID_CREDIT_AMOUNT');
    });

    it('should throw INVALID_CREDIT_AMOUNT for non-integer amount', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);

      expect(() => addPurchasedCredits(testUserId, 10.5, testPaymentId)).toThrow('INVALID_CREDIT_AMOUNT');
    });

    it('should throw INVALID_CREDIT_AMOUNT when amount exceeds MAX_CREDITS_PER_PURCHASE', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);

      expect(() => addPurchasedCredits(testUserId, MAX_CREDITS_PER_PURCHASE + 1, testPaymentId)).toThrow('INVALID_CREDIT_AMOUNT');
    });

    it('should accept amount equal to MAX_CREDITS_PER_PURCHASE', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);

      const txn = addPurchasedCredits(testUserId, MAX_CREDITS_PER_PURCHASE, testPaymentId);
      expect(txn.type).toBe('purchase');
      expect(txn.amount).toBe(MAX_CREDITS_PER_PURCHASE);
    });

    it('should add credits to paid balance', () => {
      const testUserId = createTestUserId();
      initializeUserCredits(testUserId);
      const txn = addPurchasedCredits(testUserId, CREDITS_PER_PACK, testPaymentId);

      expect(txn.type).toBe('purchase');
      expect(txn.amount).toBe(CREDITS_PER_PACK);
      expect(txn.freeAmount).toBe(0);
      expect(txn.paidAmount).toBe(CREDITS_PER_PACK);
      expect(txn.balanceAfterPaid).toBe(CREDITS_PER_PACK);
      expect(txn.referenceId).toBe(testPaymentId);

      const balance = getUserCredits(testUserId);
      expect(balance?.paidRemaining).toBe(CREDITS_PER_PACK);
    });

    it('should initialize user if not exists, then add credits', () => {
      const userId = 'user_new_purchase';
      const txn = addPurchasedCredits(userId, CREDITS_PER_PACK, testPaymentId);

      expect(txn.type).toBe('purchase');

      const balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(FREE_CREDITS); // Auto-initialized
      expect(balance?.paidRemaining).toBe(CREDITS_PER_PACK);
    });

    it('should be idempotent (same referenceId returns existing txn)', () => {
      const userId = 'user_idempotent';
      initializeUserCredits(userId);

      const txn1 = addPurchasedCredits(userId, CREDITS_PER_PACK, testPaymentId);
      const txn2 = addPurchasedCredits(userId, CREDITS_PER_PACK, testPaymentId);

      expect(txn1.id).toBe(txn2.id); // Same transaction
      expect(txn1).toEqual(txn2);

      const balance = getUserCredits(userId);
      expect(balance?.paidRemaining).toBe(CREDITS_PER_PACK); // Only added once
    });

    it('should accumulate multiple purchases with different referenceIds', () => {
      const userId = 'user_multiple_purchase';
      initializeUserCredits(userId);

      addPurchasedCredits(userId, CREDITS_PER_PACK, 'payment1');
      addPurchasedCredits(userId, CREDITS_PER_PACK, 'payment2');

      const balance = getUserCredits(userId);
      expect(balance?.paidRemaining).toBe(CREDITS_PER_PACK * 2);
    });
  });

  describe('getUserTransactions', () => {
    it('should return empty array for unknown user', () => {
      const transactions = getUserTransactions('unknown_user');
      expect(transactions).toEqual([]);
    });

    it('should return all transactions in chronological order', () => {
      const userId = 'user_txn_history';
      initializeUserCredits(userId);
      consumeCredit(userId, 'ref1');
      addPurchasedCredits(userId, CREDITS_PER_PACK, testPaymentId);
      consumeCredit(userId, 'ref2');

      const transactions = getUserTransactions(userId);

      expect(transactions).toHaveLength(4); // 1 grant + 1 consume + 1 purchase + 1 consume
      expect(transactions[0].type).toBe('grant_free');
      expect(transactions[1].type).toBe('consume');
      expect(transactions[2].type).toBe('purchase');
      expect(transactions[3].type).toBe('consume');
    });
  });

  describe('Credit consumption order', () => {
    it('should consume free credits before paid credits', () => {
      const userId = 'user_consumption_order';
      initializeUserCredits(userId);
      addPurchasedCredits(userId, 5, testPaymentId);

      // Initial: 3 free + 5 paid = 8 total
      let balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(3);
      expect(balance?.paidRemaining).toBe(5);

      // Consume 1st: should use free
      consumeCredit(userId, 'gen1');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(2);
      expect(balance?.paidRemaining).toBe(5);

      // Consume 2nd: should use free
      consumeCredit(userId, 'gen2');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(1);
      expect(balance?.paidRemaining).toBe(5);

      // Consume 3rd: should use last free
      consumeCredit(userId, 'gen3');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(0);
      expect(balance?.paidRemaining).toBe(5);

      // Consume 4th: should use paid (free exhausted)
      consumeCredit(userId, 'gen4');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(0);
      expect(balance?.paidRemaining).toBe(4);

      // Verify totalUsed
      expect(balance?.totalUsed).toBe(4);
    });
  });

  describe('Mixed balance scenario', () => {
    it('should handle 1 free + 5 paid correctly', () => {
      const userId = 'user_mixed';
      initializeUserCredits(userId);

      // Consume 2 free credits
      consumeCredit(userId, 'ref1');
      consumeCredit(userId, 'ref2');

      // Add 5 paid credits
      addPurchasedCredits(userId, 5, testPaymentId);

      // Now: 1 free + 5 paid
      let balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(1);
      expect(balance?.paidRemaining).toBe(5);

      // Consume: should use the last free
      consumeCredit(userId, 'ref3');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(0);
      expect(balance?.paidRemaining).toBe(5);

      // Next consume: should use paid
      consumeCredit(userId, 'ref4');
      balance = getUserCredits(userId);
      expect(balance?.freeRemaining).toBe(0);
      expect(balance?.paidRemaining).toBe(4);
    });
  });

  describe('Transaction balance snapshots', () => {
    it('should record accurate balance snapshots in each transaction', () => {
      const userId = 'user_snapshot_test';
      initializeUserCredits(userId);

      const transactions = getUserTransactions(userId);
      const grantTxn = transactions[0];
      expect(grantTxn.balanceAfterFree).toBe(3);
      expect(grantTxn.balanceAfterPaid).toBe(0);

      consumeCredit(userId, 'ref1');
      const consumeTxn = getUserTransactions(userId)[1];
      expect(consumeTxn.balanceAfterFree).toBe(2);
      expect(consumeTxn.balanceAfterPaid).toBe(0);

      addPurchasedCredits(userId, 10, testPaymentId);
      const purchaseTxn = getUserTransactions(userId)[2];
      expect(purchaseTxn.balanceAfterFree).toBe(2);
      expect(purchaseTxn.balanceAfterPaid).toBe(10);
    });
  });
});
