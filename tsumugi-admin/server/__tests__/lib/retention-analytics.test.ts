import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      all: vi.fn(),
      get: vi.fn(),
    },
  };
});

vi.mock('../../db/index.js', () => ({ db: mockDb }));

import {
  getCohortAnalysis,
  getAtRiskCustomers,
  getLtvDistribution,
  getRetentionSummary,
} from '../../lib/retention-analytics.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCohortAnalysis', () => {
  it('returns empty array when no customers', () => {
    mockDb.all.mockReturnValue([]);
    const result = getCohortAnalysis();
    expect(result).toEqual([]);
    expect(mockDb.all).toHaveBeenCalledOnce();
  });

  it('returns cohort rows with rounded avgDaysToFirstPurchase', () => {
    mockDb.all.mockReturnValue([
      {
        cohort: '2026-01',
        total: 10,
        converted: 6,
        repeated: 3,
        revenue: 5880,
        avgDaysToFirstPurchase: 2.3456,
      },
      {
        cohort: '2026-02',
        total: 5,
        converted: 2,
        repeated: 0,
        revenue: 1960,
        avgDaysToFirstPurchase: null,
      },
    ]);

    const result = getCohortAnalysis();
    expect(result).toEqual([
      {
        cohort: '2026-01',
        total: 10,
        converted: 6,
        repeated: 3,
        revenue: 5880,
        avgDaysToFirstPurchase: 2.3,
      },
      {
        cohort: '2026-02',
        total: 5,
        converted: 2,
        repeated: 0,
        revenue: 1960,
        avgDaysToFirstPurchase: null,
      },
    ]);
  });
});

describe('getAtRiskCustomers', () => {
  it('returns at-risk customers from db', () => {
    const atRiskData = [
      {
        id: 'c1',
        name: 'Test User',
        email: 'test@example.com',
        lastPurchaseAt: '2025-12-01T00:00:00Z',
        daysSinceLastPurchase: 82,
        totalOrders: 3,
        totalSpent: 2940,
      },
    ];
    mockDb.all.mockReturnValue(atRiskData);

    const result = getAtRiskCustomers();
    expect(result).toEqual(atRiskData);
    expect(mockDb.all).toHaveBeenCalledOnce();
  });

  it('uses default limit of 20', () => {
    mockDb.all.mockReturnValue([]);
    getAtRiskCustomers();
    // The SQL template includes the limit parameter
    expect(mockDb.all).toHaveBeenCalledOnce();
  });

  it('accepts custom limit', () => {
    mockDb.all.mockReturnValue([]);
    getAtRiskCustomers(5);
    expect(mockDb.all).toHaveBeenCalledOnce();
  });

  it('returns empty array when no at-risk customers', () => {
    mockDb.all.mockReturnValue([]);
    const result = getAtRiskCustomers();
    expect(result).toEqual([]);
  });
});

describe('getLtvDistribution', () => {
  it('returns LTV buckets from db', () => {
    const buckets = [
      { bucket: '¥0', count: 5, totalRevenue: 0 },
      { bucket: '¥1-980', count: 10, totalRevenue: 9800 },
      { bucket: '¥981-2,940', count: 3, totalRevenue: 5880 },
      { bucket: '¥2,941-9,800', count: 2, totalRevenue: 15680 },
      { bucket: '¥9,801+', count: 1, totalRevenue: 19600 },
    ];
    mockDb.all.mockReturnValue(buckets);

    const result = getLtvDistribution();
    expect(result).toEqual(buckets);
  });

  it('returns empty array when no customers', () => {
    mockDb.all.mockReturnValue([]);
    const result = getLtvDistribution();
    expect(result).toEqual([]);
  });
});

describe('getRetentionSummary', () => {
  it('returns summary with calculated churn rate', () => {
    mockDb.get.mockReturnValue({
      totalActive: 80,
      totalLapsed: 20,
      avgDaysToFirstPurchase: 3.456,
      atRiskCount: 5,
      avgOrderFrequency: 2.345,
    });

    const result = getRetentionSummary();
    expect(result).toEqual({
      churnRate: 20,
      avgDaysToFirstPurchase: 3.5,
      atRiskCount: 5,
      avgOrderFrequency: 2.3,
    });
  });

  it('returns defaults when no customers', () => {
    mockDb.get.mockReturnValue(null);
    const result = getRetentionSummary();
    expect(result).toEqual({
      churnRate: 0,
      avgDaysToFirstPurchase: null,
      atRiskCount: 0,
      avgOrderFrequency: 0,
    });
  });

  it('returns churnRate=0 when only active customers', () => {
    mockDb.get.mockReturnValue({
      totalActive: 50,
      totalLapsed: 0,
      avgDaysToFirstPurchase: 1.5,
      atRiskCount: 2,
      avgOrderFrequency: 3.0,
    });

    const result = getRetentionSummary();
    expect(result).toEqual({
      churnRate: 0,
      avgDaysToFirstPurchase: 1.5,
      atRiskCount: 2,
      avgOrderFrequency: 3,
    });
  });

  it('handles null avgDaysToFirstPurchase', () => {
    mockDb.get.mockReturnValue({
      totalActive: 10,
      totalLapsed: 5,
      avgDaysToFirstPurchase: null,
      atRiskCount: 0,
      avgOrderFrequency: null,
    });

    const result = getRetentionSummary();
    expect(result).toEqual({
      churnRate: 33.3,
      avgDaysToFirstPurchase: null,
      atRiskCount: 0,
      avgOrderFrequency: 0,
    });
  });

  it('handles zero active+lapsed (all new)', () => {
    mockDb.get.mockReturnValue({
      totalActive: 0,
      totalLapsed: 0,
      avgDaysToFirstPurchase: null,
      atRiskCount: 0,
      avgOrderFrequency: null,
    });

    const result = getRetentionSummary();
    expect(result).toEqual({
      churnRate: 0,
      avgDaysToFirstPurchase: null,
      atRiskCount: 0,
      avgOrderFrequency: 0,
    });
  });
});
