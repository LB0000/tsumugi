import { db } from '../db/index.js';
import { apiUsageLogs, systemStatus } from '../db/schema.js';
import { eq, gte, sql, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createAlert } from './alerts.js';

export type ApiService = 'gemini' | 'square' | 'resend' | 'tsumugi';
export type ApiCallStatus = 'success' | 'error' | 'timeout';

export function recordApiCall(
  service: ApiService,
  endpoint: string | null,
  status: ApiCallStatus,
  responseTimeMs: number | null,
  errorMessage?: string | null,
): void {
  try {
    db.insert(apiUsageLogs)
      .values({
        id: nanoid(),
        service,
        endpoint,
        status,
        responseTimeMs,
        errorMessage: errorMessage ?? null,
        createdAt: new Date().toISOString(),
      })
      .run();
  } catch {
    // Don't let monitoring failures break the app
  }
}

export interface ServiceStats {
  service: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgResponseTimeMs: number | null;
}

export function getApiStats(service?: string, hours: number = 24): ServiceStats[] {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const conditions = [gte(apiUsageLogs.createdAt, since)];
  if (service) {
    conditions.push(eq(apiUsageLogs.service, service));
  }

  const rows = db
    .select({
      service: apiUsageLogs.service,
      totalCalls: sql<number>`COUNT(*)`,
      successCount: sql<number>`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)`,
      errorCount: sql<number>`SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END)`,
      avgResponseTimeMs: sql<number | null>`AVG(response_time_ms)`,
    })
    .from(apiUsageLogs)
    .where(and(...conditions))
    .groupBy(apiUsageLogs.service)
    .all();

  return rows.map((r) => ({
    service: r.service,
    totalCalls: Number(r.totalCalls),
    successCount: Number(r.successCount),
    errorCount: Number(r.errorCount),
    successRate:
      Number(r.totalCalls) > 0
        ? Math.round((Number(r.successCount) / Number(r.totalCalls)) * 10000) / 100
        : 0,
    avgResponseTimeMs: r.avgResponseTimeMs ? Math.round(Number(r.avgResponseTimeMs)) : null,
  }));
}

export interface HealthCheckResult {
  service: string;
  available: boolean;
  latencyMs: number | null;
  error: string | null;
  configured: boolean;
}

export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check TSUMUGI main service
  const tsumugiUrl = process.env.TSUMUGI_API_URL || 'http://localhost:3001';
  results.push(await checkEndpoint('tsumugi', `${tsumugiUrl}/api/health`));

  // Check Gemini - just verify key is configured
  results.push({
    service: 'gemini',
    available: !!process.env.GEMINI_API_KEY,
    latencyMs: null,
    error: process.env.GEMINI_API_KEY ? null : 'GEMINI_API_KEY not configured',
    configured: !!process.env.GEMINI_API_KEY,
  });

  // Check Square - verify token is configured
  results.push({
    service: 'square',
    available: !!process.env.SQUARE_ACCESS_TOKEN,
    latencyMs: null,
    error: process.env.SQUARE_ACCESS_TOKEN ? null : 'SQUARE_ACCESS_TOKEN not configured (using mock)',
    configured: !!process.env.SQUARE_ACCESS_TOKEN,
  });

  // Check Resend - verify key is configured
  results.push({
    service: 'resend',
    available: !!process.env.RESEND_API_KEY,
    latencyMs: null,
    error: process.env.RESEND_API_KEY ? null : 'RESEND_API_KEY not configured (using mock)',
    configured: !!process.env.RESEND_API_KEY,
  });

  // Update system status
  const now = new Date().toISOString();
  const statusRow = db
    .select()
    .from(systemStatus)
    .where(eq(systemStatus.key, 'last_health_check'))
    .get();

  if (statusRow) {
    db.update(systemStatus)
      .set({ value: now, updatedAt: now })
      .where(eq(systemStatus.key, 'last_health_check'))
      .run();
  } else {
    db.insert(systemStatus)
      .values({ key: 'last_health_check', value: now, updatedAt: now })
      .run();
  }

  // Create alert if any critical service is down
  const downServices = results.filter((r) => r.configured && !r.available);
  if (downServices.length > 0) {
    createAlert({
      type: 'api_error',
      severity: 'warning',
      title: 'APIサービス接続エラー',
      message: `以下のサービスに接続できません: ${downServices.map((s) => s.service).join(', ')}`,
      metadata: { services: downServices.map((s) => ({ service: s.service, error: s.error })) },
    });
  }

  return results;
}

async function checkEndpoint(
  service: string,
  url: string,
): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    return {
      service,
      available: res.ok,
      latencyMs,
      error: res.ok ? null : `HTTP ${res.status}`,
      configured: true,
    };
  } catch (error) {
    return {
      service,
      available: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: true,
    };
  }
}

export function cleanOldLogs(retentionDays: number = 30): number {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = db.delete(apiUsageLogs).where(sql`created_at < ${cutoff}`).run();
  return result.changes;
}
