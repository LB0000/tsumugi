import cron, { type ScheduledTask } from 'node-cron';
import { createBackup, cleanOldBackups } from '../lib/backup.js';
import { syncCustomers } from '../lib/customer-sync.js';
import { autoSyncFunnelData, getYesterdayJST } from '../lib/funnel-auto-sync.js';
import { runHealthChecks, cleanOldLogs } from '../lib/api-monitor.js';
import { createAlert } from '../lib/alerts.js';

const tasks: ScheduledTask[] = [];

export function startAllJobs(): void {
  // Daily backup at 4:00 AM JST
  tasks.push(
    cron.schedule('0 4 * * *', async () => {
      console.log('[cron] Running daily backup...');
      try {
        const result = await createBackup();
        const cleaned = await cleanOldBackups(30);
        console.log(`[cron] Backup complete: ${result.filename} (${cleaned} old backups removed)`);
      } catch (err) {
        console.error('[cron] Backup failed:', err);
      }
    }, { timezone: 'Asia/Tokyo' }),
  );

  // Customer sync every hour
  tasks.push(
    cron.schedule('0 * * * *', async () => {
      console.log('[cron] Running customer sync...');
      try {
        const result = await syncCustomers();
        console.log(`[cron] Customer sync complete: ${result.created} created, ${result.updated} updated`);
      } catch (err) {
        console.error('[cron] Customer sync failed:', err);
      }
    }, { timezone: 'Asia/Tokyo' }),
  );

  // Funnel data collection at 3:00 AM JST (yesterday's data)
  tasks.push(
    cron.schedule('0 3 * * *', async () => {
      const date = getYesterdayJST();
      console.log(`[cron] Running funnel sync for ${date}...`);
      try {
        const result = await autoSyncFunnelData(date);
        if (result.data) {
          console.log(`[cron] Funnel sync complete: ${result.data.charges} charges, ¥${result.data.revenue} revenue`);
        } else {
          console.log(`[cron] Funnel sync: no data for ${date}`);
        }
      } catch (err) {
        console.error('[cron] Funnel sync failed:', err);
      }
    }, { timezone: 'Asia/Tokyo' }),
  );

  // Health check every 15 minutes
  tasks.push(
    cron.schedule('*/15 * * * *', async () => {
      try {
        const results = await runHealthChecks();
        const failures = results.filter((r) => r.configured && !r.available);
        if (failures.length > 0) {
          const names = failures.map((f) => f.service).join(', ');
          await createAlert({
            type: 'api_error',
            severity: 'warning',
            title: 'APIヘルスチェック異常',
            message: `以下のサービスに接続できません: ${names}`,
          });
          console.warn(`[cron] Health check: ${failures.length} services down (${names})`);
        }
      } catch (err) {
        console.error('[cron] Health check failed:', err);
      }
    }, { timezone: 'Asia/Tokyo' }),
  );

  // Clean old API logs daily at 4:30 AM JST
  tasks.push(
    cron.schedule('30 4 * * *', () => {
      console.log('[cron] Cleaning old API logs...');
      try {
        const removed = cleanOldLogs(30);
        console.log(`[cron] Cleaned ${removed} old API log entries`);
      } catch (err) {
        console.error('[cron] Log cleanup failed:', err);
      }
    }, { timezone: 'Asia/Tokyo' }),
  );

  console.log(`Started ${tasks.length} scheduled jobs`);
}

export function stopAllJobs(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  console.log('Stopped all scheduled jobs');
}
