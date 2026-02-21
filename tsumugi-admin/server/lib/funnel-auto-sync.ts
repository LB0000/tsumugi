import { db } from '../db/index.js';
import { funnelSnapshots, systemStatus } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { fetchAnalytics } from './square-analytics.js';
import { createAlert } from './alerts.js';

export async function autoSyncFunnelData(date: string): Promise<{
  success: boolean;
  date: string;
  data: { charges: number; revenue: number } | null;
}> {
  try {
    const analytics = await fetchAnalytics(date, date);

    const charges = analytics.data.reduce((sum, d) => sum + d.totalOrders, 0);
    const revenue = analytics.data.reduce((sum, d) => sum + d.totalRevenue, 0);

    // Check if there's already a manual entry for this date
    const existing = db
      .select()
      .from(funnelSnapshots)
      .where(eq(funnelSnapshots.date, date))
      .get();

    if (existing) {
      // Preserve manually entered visitors/freeGenerations, update Square-derived fields
      db.update(funnelSnapshots)
        .set({ charges, revenue })
        .where(eq(funnelSnapshots.date, date))
        .run();
    } else {
      db.insert(funnelSnapshots)
        .values({
          id: nanoid(),
          date,
          visitors: 0,
          freeGenerations: 0,
          charges,
          physicalPurchases: 0,
          revenue,
          createdAt: new Date().toISOString(),
        })
        .run();
    }

    // Update system status
    const now = new Date().toISOString();
    const statusRow = db
      .select()
      .from(systemStatus)
      .where(eq(systemStatus.key, 'last_funnel_sync'))
      .get();

    if (statusRow) {
      db.update(systemStatus)
        .set({ value: now, updatedAt: now })
        .where(eq(systemStatus.key, 'last_funnel_sync'))
        .run();
    } else {
      db.insert(systemStatus)
        .values({ key: 'last_funnel_sync', value: now, updatedAt: now })
        .run();
    }

    return { success: true, date, data: { charges, revenue } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    createAlert({
      type: 'sync_failure',
      severity: 'warning',
      title: 'ファネル自動収集失敗',
      message: `${date} のファネルデータ収集に失敗: ${message}`,
    });
    return { success: false, date, data: null };
  }
}

/** Get yesterday's date in YYYY-MM-DD format (JST) */
export function getYesterdayJST(): string {
  const now = new Date();
  // JST is UTC+9
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setDate(jst.getDate() - 1);
  return jst.toISOString().split('T')[0];
}
