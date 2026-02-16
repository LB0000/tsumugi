import path from 'path';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';

export interface StyleCount {
  styleId: string;
  styleName: string;
  category: string;
  count: number;
  lastUsedAt: string;
}

interface PersistedStyleAnalytics {
  version: number;
  counts: StyleCount[];
}

const STYLE_ANALYTICS_PATH = path.resolve(process.cwd(), 'server', '.data', 'style-analytics.json');
const PERSIST_DEBOUNCE_MS = 5_000;

const countsByKey = new Map<string, StyleCount>();
let persistQueue: Promise<void> = Promise.resolve();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function makeKey(styleId: string, category: string): string {
  return `${styleId}::${category}`;
}

function flushState(): void {
  const snapshot: PersistedStyleAnalytics = {
    version: 1,
    counts: [...countsByKey.values()],
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(STYLE_ANALYTICS_PATH, snapshot))
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

function hydrateState(): void {
  const parsed = readJsonFile<PersistedStyleAnalytics>(STYLE_ANALYTICS_PATH, {
    version: 1,
    counts: [],
  });

  for (const entry of parsed.counts) {
    if (!isStyleCount(entry)) continue;
    const key = makeKey(entry.styleId, entry.category);
    countsByKey.set(key, { ...entry, count: Math.floor(entry.count) });
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

hydrateState();

// Flush pending writes on graceful shutdown
process.on('SIGTERM', () => {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  flushState();
});
