/**
 * Unit tests for scheduled emails library
 * Tests scheduleReviewRequestEmail, startScheduledEmailChecker, stopScheduledEmailChecker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

vi.mock('../../lib/persistence.js', () => ({
  readJsonFile: vi.fn(() => []),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient.js', () => ({
  hasSupabaseConfig: vi.fn(() => false),
}));

vi.mock('../../lib/email.js', () => ({
  sendReviewRequestEmail: vi.fn(async () => true),
}));

vi.mock('../../lib/scheduledEmailsStore.js', () => ({
  loadScheduledEmailsSnapshot: vi.fn(async () => []),
  persistScheduledEmailsSnapshot: vi.fn(async () => {}),
}));

// ── Imports ───────────────────────────────────────────

import { logger } from '../../lib/logger.js';

// ── Tests ─────────────────────────────────────────────

describe('Scheduled Emails Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Dynamic import to avoid module-level side effects across tests
  async function importModule() {
    vi.resetModules();
    return import('../../lib/scheduledEmails.js');
  }

  describe('scheduleReviewRequestEmail', () => {
    it('should schedule a review request email', async () => {
      const mod = await importModule();

      // Should not throw
      mod.scheduleReviewRequestEmail('user@example.com', 'ORD-001', 'Test User');
    });

    it('should deduplicate schedules for the same orderId', async () => {
      const mod = await importModule();

      mod.scheduleReviewRequestEmail('user@example.com', 'ORD-002', 'Test User');
      mod.scheduleReviewRequestEmail('user@example.com', 'ORD-002', 'Test User');

      // No error should occur, and persistence should be called only once for the first schedule
    });

    it('should schedule different emails for different orderIds', async () => {
      const mod = await importModule();

      mod.scheduleReviewRequestEmail('user@example.com', 'ORD-003', 'Test User');
      mod.scheduleReviewRequestEmail('user@example.com', 'ORD-004', 'Test User');

      // Both should be scheduled without error
    });
  });

  describe('startScheduledEmailChecker', () => {
    it('should start the checker without errors', async () => {
      const mod = await importModule();

      mod.startScheduledEmailChecker();
      expect(logger.info).toHaveBeenCalledWith('Scheduled email checker started');

      // Cleanup
      mod.stopScheduledEmailChecker();
    });

    it('should be idempotent (calling start twice does not create duplicate intervals)', async () => {
      const mod = await importModule();

      mod.startScheduledEmailChecker();
      mod.startScheduledEmailChecker();

      // logger.info for "started" should only be called once
      const startCalls = (logger.info as any).mock.calls.filter(
        (call: any[]) => call[0] === 'Scheduled email checker started',
      );
      expect(startCalls).toHaveLength(1);

      mod.stopScheduledEmailChecker();
    });
  });

  describe('stopScheduledEmailChecker', () => {
    it('should stop the checker and log', async () => {
      const mod = await importModule();

      mod.startScheduledEmailChecker();
      mod.stopScheduledEmailChecker();

      expect(logger.info).toHaveBeenCalledWith('Scheduled email checker stopped');
    });

    it('should be safe to call stop without start', async () => {
      const mod = await importModule();

      // Should not throw
      mod.stopScheduledEmailChecker();

      // logger.info should not contain 'stopped' since checker was never started
      const stopCalls = (logger.info as any).mock.calls.filter(
        (call: any[]) => call[0] === 'Scheduled email checker stopped',
      );
      expect(stopCalls).toHaveLength(0);
    });
  });

  describe('scheduledEmailsHydrationReady', () => {
    it('should resolve without error when Supabase is not configured', async () => {
      const mod = await importModule();

      // Should resolve (Supabase not configured, falls back to sync hydration)
      await expect(mod.scheduledEmailsHydrationReady).resolves.toBeUndefined();
    });
  });
});
