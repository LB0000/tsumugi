import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockConfig, mockCreateAlert } = vi.hoisted(() => {
  const chainable = (allResult?: unknown[], getResult?: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'insert', 'update', 'set', 'values', 'delete', 'groupBy'];
    for (const m of methods) { chain[m] = vi.fn(() => chain); }
    chain.get = vi.fn(() => getResult);
    chain.all = vi.fn(() => allResult ?? []);
    chain.run = vi.fn(() => ({ changes: 5 }));
    return chain;
  };
  return {
    mockDb: {
      insert: vi.fn(() => chainable()),
      select: vi.fn(() => chainable()),
      update: vi.fn(() => chainable()),
      delete: vi.fn(() => chainable([], undefined)),
    },
    mockConfig: {
      TSUMUGI_API_URL: 'http://localhost:3001',
      GEMINI_API_KEY: 'test-gemini-key',
      SQUARE_ACCESS_TOKEN: 'test-square-token',
      RESEND_API_KEY: 'test-resend-key',
    },
    mockCreateAlert: vi.fn(),
  };
});

vi.mock('../../db/index.js', () => ({ db: mockDb }));
vi.mock('../../db/schema.js', () => ({
  apiUsageLogs: { service: 'service', createdAt: 'created_at' },
  systemStatus: { key: 'key' },
}));
vi.mock('../../config.js', () => ({ config: mockConfig }));
vi.mock('../../lib/alerts.js', () => ({ createAlert: mockCreateAlert }));
vi.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import { recordApiCall, getApiStats, runHealthChecks, cleanOldLogs } from '../../lib/api-monitor.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.TSUMUGI_API_URL = 'http://localhost:3001';
  mockConfig.GEMINI_API_KEY = 'test-gemini-key';
  mockConfig.SQUARE_ACCESS_TOKEN = 'test-square-token';
  mockConfig.RESEND_API_KEY = 'test-resend-key';
});

describe('recordApiCall', () => {
  it('inserts log entry into db', () => {
    recordApiCall('gemini', 'generateContent', 'success', 150);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('inserts with error message', () => {
    const chain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.insert>);

    recordApiCall('resend', 'sendEmail', 'error', 500, 'API quota exceeded');
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'resend',
        endpoint: 'sendEmail',
        status: 'error',
        errorMessage: 'API quota exceeded',
      }),
    );
  });

  it('sets errorMessage to null when not provided', () => {
    const chain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.insert>);

    recordApiCall('gemini', 'generateContent', 'success', 100);
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: null,
      }),
    );
  });

  it('does not throw when db insert fails', () => {
    mockDb.insert.mockImplementation(() => { throw new Error('DB error'); });
    expect(() => recordApiCall('gemini', 'test', 'error', 0)).not.toThrow();
  });
});

describe('getApiStats', () => {
  it('returns stats from db', () => {
    const rows = [
      { service: 'gemini', totalCalls: 100, successCount: 95, errorCount: 5, avgResponseTimeMs: 200 },
    ];
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      all: vi.fn(() => rows),
    };
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const stats = getApiStats();
    expect(stats).toHaveLength(1);
    expect(stats[0].service).toBe('gemini');
    expect(stats[0].successRate).toBe(95);
    expect(stats[0].avgResponseTimeMs).toBe(200);
  });

  it('returns empty array when no logs', () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      all: vi.fn(() => []),
    };
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const stats = getApiStats('nonexistent');
    expect(stats).toEqual([]);
  });
});

describe('runHealthChecks', () => {
  it('returns results for all services', async () => {
    // Mock fetch for tsumugi health check
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    // Mock system status select → get (no existing row)
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => null),
    };
    mockDb.select.mockReturnValue(selectChain as unknown as ReturnType<typeof mockDb.select>);

    const insertChain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(insertChain as unknown as ReturnType<typeof mockDb.insert>);

    const results = await runHealthChecks();
    expect(results).toHaveLength(4);
    expect(results.map(r => r.service)).toEqual(['tsumugi', 'gemini', 'square', 'resend']);
    expect(results.every(r => r.available)).toBe(true);
  });

  it('marks services as unavailable when keys are not configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    mockConfig.GEMINI_API_KEY = '';
    mockConfig.SQUARE_ACCESS_TOKEN = '';
    mockConfig.RESEND_API_KEY = '';

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => null),
    };
    mockDb.select.mockReturnValue(selectChain as unknown as ReturnType<typeof mockDb.select>);
    const insertChain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(insertChain as unknown as ReturnType<typeof mockDb.insert>);

    const results = await runHealthChecks();
    const gemini = results.find(r => r.service === 'gemini')!;
    expect(gemini.available).toBe(false);
    expect(gemini.configured).toBe(false);
    // No alert created because not configured
    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it('creates alert when configured service is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => null),
    };
    mockDb.select.mockReturnValue(selectChain as unknown as ReturnType<typeof mockDb.select>);
    const insertChain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(insertChain as unknown as ReturnType<typeof mockDb.insert>);

    const results = await runHealthChecks();
    const tsumugi = results.find(r => r.service === 'tsumugi')!;
    expect(tsumugi.available).toBe(false);
    expect(tsumugi.configured).toBe(true);
    expect(tsumugi.error).toBe('Connection refused');
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api_error',
        severity: 'warning',
      }),
    );
  });
});

describe('cleanOldLogs', () => {
  it('returns number of deleted rows', () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      run: vi.fn(() => ({ changes: 42 })),
    };
    mockDb.delete.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.delete>);

    const deleted = cleanOldLogs(30);
    expect(deleted).toBe(42);
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });

  it('uses default retention of 30 days', () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      run: vi.fn(() => ({ changes: 0 })),
    };
    mockDb.delete.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.delete>);

    const deleted = cleanOldLogs();
    expect(deleted).toBe(0);
  });
});
