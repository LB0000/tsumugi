import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';

export interface StyleCount {
  styleId: string;
  styleName: string;
  category: string;
  count: number;
  lastUsedAt: string;
}

export interface PersistedStyleAnalytics {
  version: number;
  counts: StyleCount[];
}

interface SupabaseStyleAnalyticsRow {
  analytic_key: string;
  style_id: string;
  category: string;
  style_name: string;
  count: number;
  last_used_at: string;
}

function makeAnalyticKey(styleId: string, category: string): string {
  return `${styleId}::${category}`;
}

function toRow(entry: StyleCount): SupabaseStyleAnalyticsRow {
  return {
    analytic_key: makeAnalyticKey(entry.styleId, entry.category),
    style_id: entry.styleId,
    category: entry.category,
    style_name: entry.styleName,
    count: entry.count,
    last_used_at: entry.lastUsedAt,
  };
}

function fromRow(row: SupabaseStyleAnalyticsRow): StyleCount {
  return {
    styleId: row.style_id,
    styleName: row.style_name,
    category: row.category,
    count: row.count,
    lastUsedAt: row.last_used_at,
  };
}

function getDefaultSnapshot(): PersistedStyleAnalytics {
  return { version: 1, counts: [] };
}

async function loadFromSupabase(): Promise<PersistedStyleAnalytics> {
  const rows = await selectRows<SupabaseStyleAnalyticsRow>(
    config.SUPABASE_STYLE_ANALYTICS_TABLE,
    'analytic_key,style_id,category,style_name,count,last_used_at',
  );
  return {
    version: 1,
    counts: rows.map(fromRow),
  };
}

async function persistToSupabase(snapshot: PersistedStyleAnalytics): Promise<void> {
  const rows = snapshot.counts.map(toRow);

  await upsertRows(config.SUPABASE_STYLE_ANALYTICS_TABLE, rows, 'analytic_key');
  await deleteOrphanedRows(
    config.SUPABASE_STYLE_ANALYTICS_TABLE,
    'analytic_key',
    rows.map((r) => r.analytic_key),
  );
}

export async function loadStyleAnalyticsSnapshot(filePath: string): Promise<PersistedStyleAnalytics> {
  const fallback = getDefaultSnapshot();

  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, fallback);
  }

  const localData = readJsonFile(filePath, fallback);

  try {
    const remote = await loadFromSupabase();
    if (remote.counts.length === 0 && localData.counts.length > 0) {
      return localData;
    }
    return remote;
  } catch (error) {
    logger.error('Failed to load style analytics from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localData;
}

export async function persistStyleAnalyticsSnapshot(filePath: string, snapshot: PersistedStyleAnalytics): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, snapshot);
    return;
  }

  try {
    await persistToSupabase(snapshot);
    return;
  } catch (error) {
    logger.error('Failed to persist style analytics to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, snapshot);
}
