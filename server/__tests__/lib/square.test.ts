/**
 * Unit tests for Square client initialization
 * Tests environment selection, singleton behavior, and missing token handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

vi.mock('square', () => ({
  SquareClient: vi.fn().mockImplementation(function (opts: Record<string, unknown>) {
    return {
      _token: opts.token,
      _environment: opts.environment,
    };
  }),
  SquareEnvironment: {
    Production: 'production',
    Sandbox: 'sandbox',
  },
}));

vi.mock('../../config.js', () => ({
  config: {},
}));

// ── Helpers ───────────────────────────────────────────

async function importSquareModule(envOverrides: Record<string, string | undefined> = {}) {
  const originalEnv = { ...process.env };

  // Reset to clean state
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  delete process.env.SQUARE_ENVIRONMENT;
  delete process.env.NODE_ENV;

  // Set defaults
  process.env.NODE_ENV = 'test';

  // Apply overrides
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  // Clear module cache so module-level code re-runs
  vi.resetModules();

  try {
    const mod = await import('../../lib/square.js');
    return mod;
  } finally {
    // Restore env
    for (const key of Object.keys(envOverrides)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  }
}

// ── Tests ─────────────────────────────────────────────

describe('Square Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('environment selection', () => {
    it('should use sandbox environment by default', async () => {
      const mod = await importSquareModule({
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: 'loc-123',
      });

      expect(mod.squareClient).toBeDefined();
      expect((mod.squareClient as unknown as Record<string, unknown>)._environment).toBe('sandbox');
    });

    it('should use production environment when SQUARE_ENVIRONMENT is production', async () => {
      const mod = await importSquareModule({
        SQUARE_ENVIRONMENT: 'production',
        SQUARE_ACCESS_TOKEN: 'prod-token',
        SQUARE_LOCATION_ID: 'loc-prod',
      });

      expect(mod.squareClient).toBeDefined();
      expect((mod.squareClient as unknown as Record<string, unknown>)._environment).toBe('production');
    });

    it('should use sandbox when SQUARE_ENVIRONMENT is not production', async () => {
      const mod = await importSquareModule({
        SQUARE_ENVIRONMENT: 'sandbox',
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: 'loc-123',
      });

      expect(mod.squareClient).toBeDefined();
      expect((mod.squareClient as unknown as Record<string, unknown>)._environment).toBe('sandbox');
    });
  });

  describe('client initialization', () => {
    it('should pass SQUARE_ACCESS_TOKEN to SquareClient', async () => {
      const mod = await importSquareModule({
        SQUARE_ACCESS_TOKEN: 'my-secret-token',
        SQUARE_LOCATION_ID: 'loc-123',
      });

      expect((mod.squareClient as unknown as Record<string, unknown>)._token).toBe('my-secret-token');
    });

    it('should create a SquareClient instance', async () => {
      const { SquareClient } = await import('square');

      vi.resetModules();
      process.env.SQUARE_ACCESS_TOKEN = 'test-token';
      process.env.SQUARE_LOCATION_ID = 'loc-123';
      process.env.NODE_ENV = 'test';

      await import('../../lib/square.js');

      // SquareClient constructor was called
      expect(SquareClient).toHaveBeenCalled();
    });

    it('should create client even without SQUARE_ACCESS_TOKEN in non-production', async () => {
      const mod = await importSquareModule({
        NODE_ENV: 'test',
        SQUARE_ACCESS_TOKEN: undefined,
        SQUARE_LOCATION_ID: 'loc-123',
      });

      // Client should still be created (token will be undefined)
      expect(mod.squareClient).toBeDefined();
    });
  });

  describe('locationId export', () => {
    it('should export SQUARE_LOCATION_ID from env', async () => {
      const mod = await importSquareModule({
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: 'LOC_ABC_123',
      });

      expect(mod.locationId).toBe('LOC_ABC_123');
    });

    it('should default to empty string when SQUARE_LOCATION_ID is not set', async () => {
      const mod = await importSquareModule({
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: undefined,
      });

      expect(mod.locationId).toBe('');
    });
  });

  describe('production validation', () => {
    it('should throw when SQUARE_ACCESS_TOKEN is missing in production', async () => {
      await expect(
        importSquareModule({
          NODE_ENV: 'production',
          SQUARE_ACCESS_TOKEN: undefined,
          SQUARE_LOCATION_ID: 'loc-123',
        }),
      ).rejects.toThrow('SQUARE_ACCESS_TOKEN is required in production');
    });

    it('should throw when SQUARE_LOCATION_ID is missing in production', async () => {
      await expect(
        importSquareModule({
          NODE_ENV: 'production',
          SQUARE_ACCESS_TOKEN: 'prod-token',
          SQUARE_LOCATION_ID: undefined,
        }),
      ).rejects.toThrow('SQUARE_LOCATION_ID is required in production');
    });

    it('should not throw when both tokens are present in production', async () => {
      const mod = await importSquareModule({
        NODE_ENV: 'production',
        SQUARE_ACCESS_TOKEN: 'prod-token',
        SQUARE_LOCATION_ID: 'loc-prod',
        SQUARE_ENVIRONMENT: 'production',
      });

      expect(mod.squareClient).toBeDefined();
      expect(mod.locationId).toBe('loc-prod');
    });
  });

  describe('module exports', () => {
    it('should export squareClient and locationId', async () => {
      const mod = await importSquareModule({
        SQUARE_ACCESS_TOKEN: 'test-token',
        SQUARE_LOCATION_ID: 'loc-123',
      });

      expect(mod).toHaveProperty('squareClient');
      expect(mod).toHaveProperty('locationId');
    });
  });
});
