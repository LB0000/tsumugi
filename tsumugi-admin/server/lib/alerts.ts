import { db } from '../db/index.js';
import { alerts } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type AlertType = 'backup_failure' | 'sync_failure' | 'api_error' | 'anomaly';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export function createAlert(params: {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): void {
  db.insert(alerts)
    .values({
      id: nanoid(),
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      isRead: false,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function getUnreadCount(): number {
  const row = db.get<{ count: number }>(
    sql`SELECT COUNT(*) as count FROM alerts WHERE is_read = 0`
  );
  return row?.count ?? 0;
}

export function listAlerts(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Array<typeof alerts.$inferSelect> {
  const limit = options?.limit ?? 50;
  if (options?.unreadOnly) {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.isRead, false))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .all();
  }
  return db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .all();
}

export function markAsRead(id: string): void {
  db.update(alerts)
    .set({ isRead: true, readAt: new Date().toISOString() })
    .where(eq(alerts.id, id))
    .run();
}

export function markAllAsRead(): void {
  const now = new Date().toISOString();
  db.update(alerts)
    .set({ isRead: true, readAt: now })
    .where(eq(alerts.isRead, false))
    .run();
}

export function deleteAlert(id: string): void {
  db.delete(alerts).where(eq(alerts.id, id)).run();
}
