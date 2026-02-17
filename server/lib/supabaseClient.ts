import { config } from '../config.js';

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

export async function selectRows<T>(table: string, select: string): Promise<T[]> {
  const params = new URLSearchParams({ select });
  const response = await fetch(buildTableUrl(table, params), {
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
  const response = await fetch(buildTableUrl(table, params), {
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
    await deleteAllRows(table, keyColumn);
    return;
  }

  const escapedKeys = keepKeys.map(k => {
    if (!/^[\w\-]+$/.test(k)) {
      throw new Error(`Invalid key for Supabase filter: "${k}"`);
    }
    return k;
  }).join(',');
  const params = new URLSearchParams({ [keyColumn]: `not.in.(${escapedKeys})` });
  const response = await fetch(buildTableUrl(table, params), {
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

// ================================
// Storage API helpers
// ================================

function supabaseStorageUrl(): string {
  return `${config.SUPABASE_URL}/storage/v1`;
}

export async function uploadStorageObject(
  bucket: string,
  objectPath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const url = `${supabaseStorageUrl()}/object/${encodeURIComponent(bucket)}/${objectPath}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(false),
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }
}

export async function downloadStorageObject(bucket: string, objectPath: string): Promise<Buffer> {
  const url = `${supabaseStorageUrl()}/object/${encodeURIComponent(bucket)}/${objectPath}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildSupabaseHeaders(false),
  });
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteStorageObjects(bucket: string, objectPaths: string[]): Promise<void> {
  if (objectPaths.length === 0) return;
  const url = `${supabaseStorageUrl()}/object/${encodeURIComponent(bucket)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: buildSupabaseHeaders(true),
    body: JSON.stringify({ prefixes: objectPaths }),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseSupabaseError(response));
  }
}

// ================================
// REST API helpers
// ================================

export async function upsertRows<T extends object>(table: string, rows: T[], onConflict: string): Promise<void> {
  if (rows.length === 0) return;

  const response = await fetch(buildTableUrl(table, new URLSearchParams({ on_conflict: onConflict })), {
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
