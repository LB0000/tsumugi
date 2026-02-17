import path from 'path';
import { readJsonFile } from './persistence.js';
import { logger } from './logger.js';
import { hasSupabaseConfig } from './supabaseClient.js';
import { loadStyleAnalyticsSnapshot, persistStyleAnalyticsSnapshot } from './styleAnalyticsStore.js';
import type { StyleCount, PersistedStyleAnalytics } from './styleAnalyticsStore.js';

export type { StyleCount } from './styleAnalyticsStore.js';

const STYLE_ANALYTICS_PATH = path.resolve(process.cwd(), 'server', '.data', 'style-analytics.json');
const PERSIST_DEBOUNCE_MS = 5_000;

const countsByKey = new Map<string, StyleCount>();
let persistQueue: Promise<void> = Promise.resolve();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function makeKey(styleId: string, category: string): string {
  return `${styleId}::${category}`;
}

function buildSnapshot(): PersistedStyleAnalytics {
  return {
    version: 1,
    counts: [...countsByKey.values()],
  };
}

function flushState(): void {
  const snapshot = buildSnapshot();

  persistQueue = persistQueue
    .then(() => persistStyleAnalyticsSnapshot(STYLE_ANALYTICS_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist style analytics', { error: error instanceof Error ? error.message : String(error) });
    });
}

function schedulePersist(): void {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushState();
  }, PERSIST_DEBOUNCE_MS);
}

function isStyleCount(value: unknown): value is StyleCount {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.styleId === 'string' &&
    typeof obj.styleName === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.count === 'number' &&
    Number.isFinite(obj.count) &&
    (obj.count as number) >= 0 &&
    typeof obj.lastUsedAt === 'string'
  );
}

function hydrateFromParsed(parsed: PersistedStyleAnalytics): void {
  for (const entry of parsed.counts) {
    if (!isStyleCount(entry)) continue;
    const key = makeKey(entry.styleId, entry.category);
    countsByKey.set(key, { ...entry, count: Math.floor(entry.count) });
  }
}

function hydrateStateSync(): void {
  const parsed = readJsonFile<PersistedStyleAnalytics>(STYLE_ANALYTICS_PATH, {
    version: 1,
    counts: [],
  });
  hydrateFromParsed(parsed);
}

async function hydrateStateAsync(): Promise<void> {
  try {
    const parsed = await loadStyleAnalyticsSnapshot(STYLE_ANALYTICS_PATH);
    hydrateFromParsed(parsed);
  } catch (error) {
    logger.error('Failed to hydrate style analytics from Supabase, falling back to local.', {
      error: error instanceof Error ? error.message : String(error),
    });
    hydrateStateSync();
  }
}

export function recordStyleUsage(styleId: string, styleName: string, category: string): void {
  const key = makeKey(styleId, category);
  const existing = countsByKey.get(key);
  const now = new Date().toISOString();

  if (existing) {
    const updated: StyleCount = {
      ...existing,
      styleName,
      count: existing.count + 1,
      lastUsedAt: now,
    };
    countsByKey.set(key, updated);
  } else {
    countsByKey.set(key, { styleId, styleName, category, count: 1, lastUsedAt: now });
  }

  schedulePersist();
}

export function getStyleAnalytics(): { styles: StyleCount[]; totalGenerations: number } {
  const styles = [...countsByKey.values()].sort((a, b) => b.count - a.count);
  const totalGenerations = styles.reduce((sum, s) => sum + s.count, 0);
  return { styles, totalGenerations };
}

const STYLE_HYDRATION_TIMEOUT_MS = 15_000;

export const styleAnalyticsHydrationReady: Promise<void> = hasSupabaseConfig()
  ? Promise.race([
      hydrateStateAsync(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Style analytics hydration timed out')), STYLE_HYDRATION_TIMEOUT_MS),
      ),
    ]).catch((error) => {
      logger.error('Style analytics async hydration failed or timed out.', {
        error: error instanceof Error ? error.message : String(error),
      });
    })
  : Promise.resolve(hydrateStateSync());

// Flush pending writes on graceful shutdown
process.on('SIGTERM', () => {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  flushState();
});
