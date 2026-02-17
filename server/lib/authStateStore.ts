import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  buildSupabaseHeaders,
  buildTableUrl,
  parseSupabaseError,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';

interface PersistedAddress {
  id: string;
  label: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: string;
}

interface PersistedUserRecord {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  authProvider: 'email' | 'google';
  emailVerified: boolean;
  savedAddresses?: PersistedAddress[];
  createdAt: string;
  updatedAt: string;
}

interface PersistedSessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface PersistedResetTokenRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface PersistedVerificationTokenRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface PersistedSnapshot {
  version: number;
  users: PersistedUserRecord[];
  sessions: PersistedSessionRecord[];
  resetTokens: PersistedResetTokenRecord[];
  verificationTokens?: PersistedVerificationTokenRecord[];
}

interface SupabaseUserRow {
  id: string;
  name: string;
  email: string;
  password_salt: string;
  password_hash: string;
  auth_provider: 'email' | 'google';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseSessionRow {
  token: string;
  user_id: string;
  expires_at: number;
}

interface SupabaseResetTokenRow {
  token: string;
  user_id: string;
  expires_at: number;
}

interface SupabaseVerificationTokenRow {
  token: string;
  user_id: string;
  expires_at: number;
}

interface SupabaseAddressRow {
  id: string;
  user_id: string;
  label: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line: string;
  is_default: boolean;
  created_at: string;
}

function buildLegacySelectUrl(): string {
  const params = new URLSearchParams({
    select: 'data',
    key: `eq.${config.SUPABASE_AUTH_STATE_KEY}`,
    limit: '1',
  });
  return buildTableUrl(config.SUPABASE_AUTH_STATE_TABLE, params);
}

function buildLegacyUpsertUrl(): string {
  return buildTableUrl(config.SUPABASE_AUTH_STATE_TABLE, new URLSearchParams({ on_conflict: 'key' }));
}

function getDefaultSnapshotFallback(): PersistedSnapshot {
  return {
    version: 1,
    users: [],
    sessions: [],
    resetTokens: [],
    verificationTokens: [],
  };
}

function toSnapshotOrFallback(value: unknown, fallback: PersistedSnapshot): PersistedSnapshot {
  if (typeof value !== 'object' || value === null) return fallback;
  const maybe = value as Partial<PersistedSnapshot>;
  if (!Array.isArray(maybe.users) || !Array.isArray(maybe.sessions) || !Array.isArray(maybe.resetTokens)) {
    return fallback;
  }
  return {
    version: typeof maybe.version === 'number' ? maybe.version : 1,
    users: maybe.users,
    sessions: maybe.sessions,
    resetTokens: maybe.resetTokens,
    verificationTokens: Array.isArray(maybe.verificationTokens) ? maybe.verificationTokens : [],
  };
}

function hasSnapshotData(snapshot: PersistedSnapshot): boolean {
  return (
    snapshot.users.length > 0 ||
    snapshot.sessions.length > 0 ||
    snapshot.resetTokens.length > 0 ||
    (snapshot.verificationTokens?.length ?? 0) > 0
  );
}

async function loadLegacySnapshotFromSupabase<T>(): Promise<T | null> {
  const response = await fetch(buildLegacySelectUrl(), {
    method: 'GET',
    headers: buildSupabaseHeaders(false),
  });
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }

  const rows = await response.json() as unknown;
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  if (typeof row !== 'object' || row === null || !('data' in row)) {
    return null;
  }

  return (row as { data: T }).data ?? null;
}

async function persistLegacySnapshotToSupabase<T>(snapshot: T): Promise<void> {
  const response = await fetch(buildLegacyUpsertUrl(), {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(true),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([{
      key: config.SUPABASE_AUTH_STATE_KEY,
      data: snapshot,
      updated_at: new Date().toISOString(),
    }]),
  });

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }
}

async function loadNormalizedSnapshotFromSupabase(): Promise<PersistedSnapshot> {
  const [
    users,
    sessions,
    resetTokens,
    verificationTokens,
    addresses,
  ] = await Promise.all([
    selectRows<SupabaseUserRow>(
      config.SUPABASE_AUTH_USERS_TABLE,
      'id,name,email,password_salt,password_hash,auth_provider,email_verified,created_at,updated_at',
    ),
    selectRows<SupabaseSessionRow>(
      config.SUPABASE_AUTH_SESSIONS_TABLE,
      'token,user_id,expires_at',
    ),
    selectRows<SupabaseResetTokenRow>(
      config.SUPABASE_AUTH_RESET_TOKENS_TABLE,
      'token,user_id,expires_at',
    ),
    selectRows<SupabaseVerificationTokenRow>(
      config.SUPABASE_AUTH_VERIFICATION_TOKENS_TABLE,
      'token,user_id,expires_at',
    ),
    selectRows<SupabaseAddressRow>(
      config.SUPABASE_AUTH_ADDRESSES_TABLE,
      'id,user_id,label,last_name,first_name,email,phone,postal_code,prefecture,city,address_line,is_default,created_at',
    ),
  ]);

  const addressesByUser = new Map<string, PersistedAddress[]>();
  for (const address of addresses) {
    const list = addressesByUser.get(address.user_id) ?? [];
    list.push({
      id: address.id,
      label: address.label,
      lastName: address.last_name,
      firstName: address.first_name,
      email: address.email,
      phone: address.phone,
      postalCode: address.postal_code,
      prefecture: address.prefecture,
      city: address.city,
      addressLine: address.address_line,
      isDefault: address.is_default,
      createdAt: address.created_at,
    });
    addressesByUser.set(address.user_id, list);
  }

  return {
    version: 1,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordSalt: user.password_salt,
      passwordHash: user.password_hash,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      savedAddresses: addressesByUser.get(user.id) ?? [],
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    })),
    sessions: sessions.map((session) => ({
      token: session.token,
      userId: session.user_id,
      expiresAt: session.expires_at,
    })),
    resetTokens: resetTokens.map((token) => ({
      token: token.token,
      userId: token.user_id,
      expiresAt: token.expires_at,
    })),
    verificationTokens: verificationTokens.map((token) => ({
      token: token.token,
      userId: token.user_id,
      expiresAt: token.expires_at,
    })),
  };
}

async function persistNormalizedSnapshotToSupabase(snapshot: PersistedSnapshot): Promise<void> {
  const users: SupabaseUserRow[] = snapshot.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    password_salt: user.passwordSalt,
    password_hash: user.passwordHash,
    auth_provider: user.authProvider,
    email_verified: user.emailVerified,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  }));

  const addresses: SupabaseAddressRow[] = snapshot.users.flatMap((user) =>
    (user.savedAddresses ?? []).map((address) => ({
      id: address.id,
      user_id: user.id,
      label: address.label,
      last_name: address.lastName,
      first_name: address.firstName,
      email: address.email,
      phone: address.phone,
      postal_code: address.postalCode,
      prefecture: address.prefecture,
      city: address.city,
      address_line: address.addressLine,
      is_default: address.isDefault,
      created_at: address.createdAt,
    }))
  );

  const sessions: SupabaseSessionRow[] = snapshot.sessions.map((session) => ({
    token: session.token,
    user_id: session.userId,
    expires_at: session.expiresAt,
  }));

  const resetTokens: SupabaseResetTokenRow[] = snapshot.resetTokens.map((token) => ({
    token: token.token,
    user_id: token.userId,
    expires_at: token.expiresAt,
  }));

  const verificationTokens: SupabaseVerificationTokenRow[] = (snapshot.verificationTokens ?? []).map((token) => ({
    token: token.token,
    user_id: token.userId,
    expires_at: token.expiresAt,
  }));

  // Step 1: Upsert all current data first (safe — existing rows updated, new rows inserted)
  await upsertRows(config.SUPABASE_AUTH_USERS_TABLE, users, 'id');
  await upsertRows(config.SUPABASE_AUTH_ADDRESSES_TABLE, addresses, 'id');
  await upsertRows(config.SUPABASE_AUTH_SESSIONS_TABLE, sessions, 'token');
  await upsertRows(config.SUPABASE_AUTH_RESET_TOKENS_TABLE, resetTokens, 'token');
  await upsertRows(config.SUPABASE_AUTH_VERIFICATION_TOKENS_TABLE, verificationTokens, 'token');

  // Step 2: Delete orphaned rows not in the current snapshot
  await deleteOrphanedRows(config.SUPABASE_AUTH_VERIFICATION_TOKENS_TABLE, 'token', verificationTokens.map(t => t.token));
  await deleteOrphanedRows(config.SUPABASE_AUTH_RESET_TOKENS_TABLE, 'token', resetTokens.map(t => t.token));
  await deleteOrphanedRows(config.SUPABASE_AUTH_SESSIONS_TABLE, 'token', sessions.map(s => s.token));
  await deleteOrphanedRows(config.SUPABASE_AUTH_ADDRESSES_TABLE, 'id', addresses.map(a => a.id));
  await deleteOrphanedRows(config.SUPABASE_AUTH_USERS_TABLE, 'id', users.map(u => u.id));
}

export async function loadAuthStateSnapshot<T>(filePath: string, fallback: T): Promise<T> {
  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, fallback);
  }

  const snapshotFallback = toSnapshotOrFallback(fallback, getDefaultSnapshotFallback());
  const localFallbackSnapshot = toSnapshotOrFallback(readJsonFile(filePath, fallback), snapshotFallback);

  try {
    const normalized = await loadNormalizedSnapshotFromSupabase();
    if (!hasSnapshotData(normalized) && hasSnapshotData(localFallbackSnapshot)) {
      return localFallbackSnapshot as unknown as T;
    }
    return normalized as unknown as T;
  } catch (error) {
    logger.error('Failed to load normalized auth store from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const legacy = await loadLegacySnapshotFromSupabase<PersistedSnapshot>();
    if (legacy) {
      return toSnapshotOrFallback(legacy, snapshotFallback) as unknown as T;
    }
  } catch (error) {
    logger.error('Failed to load legacy auth store snapshot from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localFallbackSnapshot as unknown as T;
}

export async function persistAuthStateSnapshot<T>(filePath: string, snapshot: T): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, snapshot);
    return;
  }

  const normalizedSnapshot = toSnapshotOrFallback(snapshot, getDefaultSnapshotFallback());

  try {
    await persistNormalizedSnapshotToSupabase(normalizedSnapshot);
    return;
  } catch (error) {
    logger.error('Failed to persist normalized auth store to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await persistLegacySnapshotToSupabase(snapshot);
    return;
  } catch (error) {
    logger.error('Failed to persist legacy auth store snapshot to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, snapshot);
}
