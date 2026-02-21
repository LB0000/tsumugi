import { apiFetch } from './index.js';

// Backup APIs
export interface BackupItem {
  filename: string;
  size: number;
  createdAt: string;
}

export async function listBackups(): Promise<BackupItem[]> {
  const data = await apiFetch<{ backups: BackupItem[] }>('/backups');
  return data.backups;
}

export async function createBackup(): Promise<{ success: boolean; filename: string; size: number }> {
  return apiFetch('/backups/create', { method: 'POST' });
}

export async function deleteBackup(filename: string): Promise<void> {
  await apiFetch(`/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

// Alert APIs
export interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export async function getAlerts(unreadOnly?: boolean): Promise<AlertItem[]> {
  const params = unreadOnly ? '?unreadOnly=true' : '';
  const data = await apiFetch<{ alerts: AlertItem[] }>(`/alerts${params}`);
  return data.alerts;
}

export async function getUnreadAlertCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/alerts/unread-count');
  return data.count;
}

export async function markAlertRead(id: string): Promise<void> {
  await apiFetch(`/alerts/${id}/read`, { method: 'PATCH' });
}

export async function markAllAlertsRead(): Promise<void> {
  await apiFetch('/alerts/mark-all-read', { method: 'POST' });
}

export async function deleteAlert(id: string): Promise<void> {
  await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
}

// API Monitor APIs
export interface ServiceStats {
  service: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgResponseTimeMs: number | null;
}

export interface HealthCheckResult {
  service: string;
  available: boolean;
  latencyMs: number | null;
  error: string | null;
  configured: boolean;
}

export async function getApiStats(service?: string): Promise<ServiceStats[]> {
  const params = service ? `?service=${service}` : '';
  const data = await apiFetch<{ stats: ServiceStats[] }>(`/api-monitor/stats${params}`);
  return data.stats;
}

export async function runHealthCheck(): Promise<HealthCheckResult[]> {
  const data = await apiFetch<{ results: HealthCheckResult[] }>('/api-monitor/health-check', {
    method: 'POST',
  });
  return data.results;
}

// System Status APIs
export async function getCustomerSyncStatus(): Promise<{ lastSync: string | null }> {
  return apiFetch('/customers/sync-status');
}

export async function getFunnelSyncStatus(): Promise<{ lastSync: string | null }> {
  return apiFetch('/funnel-sync/status');
}

export async function triggerFunnelSync(date?: string): Promise<{
  success: boolean;
  date: string;
  data: { charges: number; revenue: number } | null;
}> {
  return apiFetch('/funnel-sync/trigger', {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
}
