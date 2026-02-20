import { config } from '../config.js';
import { logger } from './logger.js';

export function hasSupabaseConfig(): boolean {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseBaseUrl(): string {
  return `${config.SUPABASE_URL}/rest/v1`;
}

export function buildSupabaseHeaders(contentType: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: config.SUPABASE_SERVICE_ROLE_KEY ?? '',
    Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
  };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export function buildTableUrl(table: string, params?: URLSearchParams): string {
  const query = params ? `?${params.toString()}` : '';
  return `${supabaseBaseUrl()}/${encodeURIComponent(table)}${query}`;
}

export async function parseSupabaseError(response: Response): Promise<string> {
  const text = await response.text();
  if (text.trim().length === 0) return `HTTP ${response.status}`;
  return `HTTP ${response.status}: ${text}`;
}

// ==================== Retry with Exponential Backoff ====================

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 500;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_RETRIES) throw lastError;
    }

    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    logger.warn('Supabase request failed, retrying', {
      attempt: attempt + 1,
      maxRetries: MAX_RETRIES,
      delayMs: delay,
      error: lastError?.message,
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw lastError ?? new Error('fetchWithRetry exhausted');
}

// ==================== CRUD Operations ====================

export async function selectRows<T>(table: string, select: string): Promise<T[]> {
  const params = new URLSearchParams({ select });
  const response = await fetchWithRetry(buildTableUrl(table, params), {
    method: 'GET',
    headers: buildSupabaseHeaders(false),
  });
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }
  const data = await response.json() as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`Invalid rows payload for table "${table}"`);
  }
  return data as T[];
}

export async function deleteAllRows(table: string, keyColumn: string): Promise<void> {
  const params = new URLSearchParams({ [keyColumn]: 'not.is.null' });
  const response = await fetchWithRetry(buildTableUrl(table, params), {
    method: 'DELETE',
    headers: {
      ...buildSupabaseHeaders(false),
      Prefer: 'return=minimal',
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseSupabaseError(response));
  }
}

export async function deleteOrphanedRows(table: string, keyColumn: string, keepKeys: string[]): Promise<void> {
  if (keepKeys.length === 0) {
    logger.warn('deleteOrphanedRows called with empty keepKeys, skipping to prevent accidental data loss', { table, keyColumn });
    return;
  }

  const escapedKeys = keepKeys.map(k => {
    if (!/^[\w-]+$/.test(k)) {
      throw new Error(`Invalid key for Supabase filter: "${k}"`);
    }
    return k;
  }).join(',');
  const params = new URLSearchParams({ [keyColumn]: `not.in.(${escapedKeys})` });
  const response = await fetchWithRetry(buildTableUrl(table, params), {
    method: 'DELETE',
    headers: {
      ...buildSupabaseHeaders(false),
      Prefer: 'return=minimal',
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseSupabaseError(response));
  }
}

export async function upsertRows<T extends object>(table: string, rows: T[], onConflict: string): Promise<void> {
  if (rows.length === 0) return;

  const response = await fetchWithRetry(buildTableUrl(table, new URLSearchParams({ on_conflict: onConflict })), {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(true),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }
}

/**
 * Delete rows older than a given timestamp column threshold.
 * Used for TTL cleanup of webhook events and pending payments directly in Supabase.
 */
export async function deleteRowsOlderThan(
  table: string,
  timestampColumn: string,
  cutoffIso: string
): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const params = new URLSearchParams({ [timestampColumn]: `lt.${cutoffIso}` });
  const response = await fetchWithRetry(buildTableUrl(table, params), {
    method: 'DELETE',
    headers: {
      ...buildSupabaseHeaders(false),
      Prefer: 'return=minimal',
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseSupabaseError(response));
  }
}
