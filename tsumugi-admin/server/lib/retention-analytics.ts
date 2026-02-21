import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface CohortRow {
  cohort: string;
  total: number;
  converted: number;
  repeated: number;
  revenue: number;
  avgDaysToFirstPurchase: number | null;
}

export interface AtRiskCustomer {
  id: string;
  name: string;
  email: string;
  lastPurchaseAt: string;
  daysSinceLastPurchase: number;
  totalOrders: number;
  totalSpent: number;
}

export interface LtvBucket {
  bucket: string;
  count: number;
  totalRevenue: number;
}

export interface RetentionSummary {
  churnRate: number;
  avgDaysToFirstPurchase: number | null;
  atRiskCount: number;
  avgOrderFrequency: number;
}

export function getCohortAnalysis(): CohortRow[] {
  const rows = db.all<{
    cohort: string;
    total: number;
    converted: number;
    repeated: number;
    revenue: number;
    avgDaysToFirstPurchase: number | null;
  }>(sql`
    SELECT
      strftime('%Y-%m', registered_at) as cohort,
      COUNT(*) as total,
      SUM(CASE WHEN total_orders > 0 THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN total_orders > 1 THEN 1 ELSE 0 END) as repeated,
      COALESCE(SUM(total_spent), 0) as revenue,
      AVG(CASE WHEN first_purchase_at IS NOT NULL
        THEN julianday(first_purchase_at) - julianday(registered_at)
        ELSE NULL END) as avgDaysToFirstPurchase
    FROM customers
    WHERE registered_at IS NOT NULL
    GROUP BY cohort
    ORDER BY cohort
  `);

  return rows.map((row) => ({
    cohort: row.cohort,
    total: row.total,
    converted: row.converted,
    repeated: row.repeated,
    revenue: row.revenue,
    avgDaysToFirstPurchase: row.avgDaysToFirstPurchase !== null
      ? Math.round(row.avgDaysToFirstPurchase * 10) / 10
      : null,
  }));
}

export function getAtRiskCustomers(limit = 20): AtRiskCustomer[] {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  return db.all<AtRiskCustomer>(sql`
    SELECT
      id,
      name,
      email,
      last_purchase_at as lastPurchaseAt,
      CAST(julianday('now') - julianday(last_purchase_at) AS INTEGER) as daysSinceLastPurchase,
      total_orders as totalOrders,
      total_spent as totalSpent
    FROM customers
    WHERE segment = 'active'
      AND last_purchase_at IS NOT NULL
      AND julianday('now') - julianday(last_purchase_at) > 60
    ORDER BY last_purchase_at ASC
    LIMIT ${safeLimit}
  `);
}

export function getLtvDistribution(): LtvBucket[] {
  return db.all<LtvBucket>(sql`
    SELECT
      CASE
        WHEN total_spent = 0 THEN '¥0'
        WHEN total_spent <= 980 THEN '¥1-980'
        WHEN total_spent <= 2940 THEN '¥981-2,940'
        WHEN total_spent <= 9800 THEN '¥2,941-9,800'
        ELSE '¥9,801+'
      END as bucket,
      COUNT(*) as count,
      COALESCE(SUM(total_spent), 0) as totalRevenue,
      CASE
        WHEN MIN(total_spent) = 0 THEN 0
        WHEN MIN(total_spent) <= 980 THEN 1
        WHEN MIN(total_spent) <= 2940 THEN 2
        WHEN MIN(total_spent) <= 9800 THEN 3
        ELSE 4
      END as sortOrder
    FROM customers
    GROUP BY bucket
    ORDER BY sortOrder
  `);
}

export function getRetentionSummary(): RetentionSummary {
  const row = db.get<{
    totalActive: number;
    totalLapsed: number;
    avgDaysToFirstPurchase: number | null;
    atRiskCount: number;
    avgOrderFrequency: number | null;
  }>(sql`
    SELECT
      SUM(CASE WHEN segment = 'active' THEN 1 ELSE 0 END) as totalActive,
      SUM(CASE WHEN segment = 'lapsed' THEN 1 ELSE 0 END) as totalLapsed,
      AVG(CASE WHEN first_purchase_at IS NOT NULL
        THEN julianday(first_purchase_at) - julianday(registered_at)
        ELSE NULL END) as avgDaysToFirstPurchase,
      SUM(CASE WHEN segment = 'active'
        AND last_purchase_at IS NOT NULL
        AND julianday('now') - julianday(last_purchase_at) > 60
        THEN 1 ELSE 0 END) as atRiskCount,
      AVG(CASE WHEN total_orders > 0 THEN total_orders ELSE NULL END) as avgOrderFrequency
    FROM customers
  `);

  if (!row) {
    return { churnRate: 0, avgDaysToFirstPurchase: null, atRiskCount: 0, avgOrderFrequency: 0 };
  }

  // Churn rate excludes 'new' segment (registered but never purchased).
  // Only active and lapsed customers are considered.
  const activeAndLapsed = row.totalActive + row.totalLapsed;
  const churnRate = activeAndLapsed > 0
    ? Math.round((row.totalLapsed / activeAndLapsed) * 1000) / 10
    : 0;

  return {
    churnRate,
    avgDaysToFirstPurchase: row.avgDaysToFirstPurchase !== null
      ? Math.round(row.avgDaysToFirstPurchase * 10) / 10
      : null,
    atRiskCount: row.atRiskCount,
    avgOrderFrequency: row.avgOrderFrequency !== null
      ? Math.round(row.avgOrderFrequency * 10) / 10
      : 0,
  };
}
