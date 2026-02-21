import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockConfig, mockRecordApiCall, mockCreateAlert } = vi.hoisted(() => {
  const chainable = (allResult?: unknown[], getResult?: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'insert', 'update', 'set', 'values', 'delete'];
    for (const m of methods) { chain[m] = vi.fn(() => chain); }
    chain.get = vi.fn(() => getResult);
    chain.all = vi.fn(() => allResult ?? []);
    chain.run = vi.fn();
    return chain;
  };
  return {
    mockDb: {
      select: vi.fn(() => chainable()),
      insert: vi.fn(() => chainable()),
      update: vi.fn(() => chainable()),
      get: vi.fn(),
      transaction: vi.fn((fn: (tx: Record<string, unknown>) => void) => {
        const tx = {
          insert: vi.fn(() => chainable()),
          update: vi.fn(() => chainable()),
        };
        fn(tx);
        return tx;
      }),
    },
    mockConfig: {
      TSUMUGI_API_URL: 'http://localhost:3001',
      INTERNAL_API_KEY: 'test-internal-key',
    },
    mockRecordApiCall: vi.fn(),
    mockCreateAlert: vi.fn(),
  };
});

vi.mock('../../db/index.js', () => ({ db: mockDb }));
vi.mock('../../db/schema.js', () => ({
  customers: { tsumugiUserId: 'tsumugi_user_id' },
  systemStatus: { key: 'key' },
}));
vi.mock('../../config.js', () => ({ config: mockConfig }));
vi.mock('../../lib/api-monitor.js', () => ({ recordApiCall: mockRecordApiCall }));
vi.mock('../../lib/alerts.js', () => ({ createAlert: mockCreateAlert }));
vi.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import { syncCustomers, getCustomerStats } from '../../lib/customer-sync.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.INTERNAL_API_KEY = 'test-internal-key';
});

describe('getCustomerStats', () => {
  it('returns all zeros when no customers', () => {
    mockDb.get.mockReturnValue(null);
    const stats = getCustomerStats();
    expect(stats).toEqual({
      totalCustomers: 0,
      customersWithPurchases: 0,
      repeatCustomers: 0,
      repeatRate: 0,
      avgLTV: 0,
      totalRevenue: 0,
      segments: { new: 0, active: 0, lapsed: 0 },
    });
  });

  it('returns all zeros when totalCustomers is 0', () => {
    mockDb.get.mockReturnValue({
      totalCustomers: 0,
      customersWithPurchases: 0,
      repeatCustomers: 0,
      totalRevenue: 0,
      segNew: 0,
      segActive: 0,
      segLapsed: 0,
    });
    const stats = getCustomerStats();
    expect(stats.totalCustomers).toBe(0);
    expect(stats.repeatRate).toBe(0);
    expect(stats.avgLTV).toBe(0);
  });

  it('calculates stats correctly with data', () => {
    mockDb.get.mockReturnValue({
      totalCustomers: 100,
      customersWithPurchases: 60,
      repeatCustomers: 20,
      totalRevenue: 500000,
      segNew: 40,
      segActive: 50,
      segLapsed: 10,
    });
    const stats = getCustomerStats();
    expect(stats.totalCustomers).toBe(100);
    expect(stats.customersWithPurchases).toBe(60);
    expect(stats.repeatCustomers).toBe(20);
    expect(stats.repeatRate).toBe(33); // 20/60 * 100, rounded
    expect(stats.avgLTV).toBe(5000); // 500000/100
    expect(stats.totalRevenue).toBe(500000);
    expect(stats.segments).toEqual({ new: 40, active: 50, lapsed: 10 });
  });

  it('returns repeatRate 0 when no customers with purchases', () => {
    mockDb.get.mockReturnValue({
      totalCustomers: 10,
      customersWithPurchases: 0,
      repeatCustomers: 0,
      totalRevenue: 0,
      segNew: 10,
      segActive: 0,
      segLapsed: 0,
    });
    const stats = getCustomerStats();
    expect(stats.repeatRate).toBe(0);
  });
});

describe('syncCustomers', () => {
  it('throws when INTERNAL_API_KEY is not set', async () => {
    mockConfig.INTERNAL_API_KEY = '';
    await expect(syncCustomers()).rejects.toThrow('INTERNAL_API_KEY is not configured');
  });

  it('creates new customers from remote', async () => {
    // Mock existing customers (empty)
    mockDb.select.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      all: vi.fn(() => []),
      get: vi.fn(),
    } as unknown as ReturnType<typeof mockDb.select>);

    // Mock fetch response
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        customers: [
          {
            tsumugiUserId: 'user-1',
            email: 'new@example.com',
            name: 'New User',
            authProvider: 'email',
            registeredAt: '2026-01-15T00:00:00Z',
            totalOrders: 0,
            totalSpent: 0,
            firstPurchaseAt: null,
            lastPurchaseAt: null,
          },
        ],
        pagination: { nextOffset: null },
      }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    // Mock system status
    const statusChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(() => null),
    };

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // First call: get existing customers
        return {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          all: vi.fn(() => []),
        } as unknown as ReturnType<typeof mockDb.select>;
      }
      // Second call: system status check
      return statusChain as unknown as ReturnType<typeof mockDb.select>;
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      run: vi.fn(),
    } as unknown as ReturnType<typeof mockDb.insert>);

    const result = await syncCustomers();
    expect(result.synced).toBe(1);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('handles fetch timeout', async () => {
    mockDb.select.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      all: vi.fn(() => []),
    } as unknown as ReturnType<typeof mockDb.select>);

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(syncCustomers()).rejects.toThrow('timed out');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'tsumugi', 'customers-sync', 'timeout', expect.any(Number), expect.any(String),
    );
  });

  it('handles non-ok HTTP response', async () => {
    mockDb.select.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      all: vi.fn(() => []),
    } as unknown as ReturnType<typeof mockDb.select>);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));

    await expect(syncCustomers()).rejects.toThrow('Failed to fetch customers: 500');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'tsumugi', 'customers-sync', 'error', expect.any(Number), 'HTTP 500',
    );
  });
});
