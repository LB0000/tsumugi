import { copyFile, readdir, stat, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.js';
import { systemStatus } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createAlert } from './alerts.js';
import { config } from '../config.js';

const DB_PATH = config.DATABASE_URL.replace('file:', '');
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}${s}`;
}

export async function createBackup(): Promise<{
  success: boolean;
  filename: string;
  size: number;
}> {
  try {
    if (!existsSync(BACKUP_DIR)) {
      await mkdir(BACKUP_DIR, { recursive: true });
    }

    const filename = `tsumugi-admin-${formatTimestamp()}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    await copyFile(DB_PATH, destPath);

    const stats = await stat(destPath);
    const now = new Date().toISOString();

    const existing = db
      .select()
      .from(systemStatus)
      .where(eq(systemStatus.key, 'last_backup'))
      .get();

    if (existing) {
      db.update(systemStatus)
        .set({ value: now, updatedAt: now })
        .where(eq(systemStatus.key, 'last_backup'))
        .run();
    } else {
      db.insert(systemStatus)
        .values({ key: 'last_backup', value: now, updatedAt: now })
        .run();
    }

    return { success: true, filename, size: stats.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    createAlert({
      type: 'backup_failure',
      severity: 'critical',
      title: 'バックアップ失敗',
      message: `DBバックアップに失敗しました: ${message}`,
    });
    return { success: false, filename: '', size: 0 };
  }
}

export async function cleanOldBackups(retentionDays: number = 30): Promise<number> {
  if (!existsSync(BACKUP_DIR)) return 0;

  const files = await readdir(BACKUP_DIR);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files) {
    if (!file.endsWith('.db')) continue;
    const filePath = path.join(BACKUP_DIR, file);
    const stats = await stat(filePath);
    if (stats.mtimeMs < cutoff) {
      await unlink(filePath);
      deleted++;
    }
  }

  return deleted;
}

export async function listBackups(): Promise<
  Array<{ filename: string; size: number; createdAt: string }>
> {
  if (!existsSync(BACKUP_DIR)) return [];

  const files = await readdir(BACKUP_DIR);
  const backups: Array<{ filename: string; size: number; createdAt: string }> = [];

  for (const file of files) {
    if (!file.endsWith('.db')) continue;
    const filePath = path.join(BACKUP_DIR, file);
    const stats = await stat(filePath);
    backups.push({
      filename: file,
      size: stats.size,
      createdAt: stats.mtime.toISOString(),
    });
  }

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteBackup(filename: string): Promise<boolean> {
  // Prevent path traversal
  const sanitized = path.basename(filename);
  if (sanitized !== filename || !filename.endsWith('.db')) {
    return false;
  }

  const filePath = path.join(BACKUP_DIR, sanitized);
  if (!existsSync(filePath)) return false;

  await unlink(filePath);
  return true;
}
