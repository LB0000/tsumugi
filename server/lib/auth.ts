import path from 'path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'crypto';

import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';

const SCRYPT_OPTIONS: ScryptOptions = { cost: 16384, blockSize: 8, parallelization: 1 };

function scryptAsync(password: string, salt: string, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export interface SavedAddress {
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

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  authProvider: 'email' | 'google';
  emailVerified: boolean;
  savedAddresses?: SavedAddress[];
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface ResetTokenRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface AuthPublicUser {
  id: string;
  name: string;
  email: string;
  authProvider: 'email' | 'google';
  emailVerified: boolean;
}

interface VerificationTokenRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface PersistedAuthState {
  version: number;
  users: UserRecord[];
  sessions: SessionRecord[];
  resetTokens: ResetTokenRecord[];
  verificationTokens?: VerificationTokenRecord[];
}

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const AUTH_STORE_PATH = path.resolve(process.cwd(), 'server', '.data', 'auth-store.json');

const usersByEmail = new Map<string, UserRecord>();
const usersById = new Map<string, UserRecord>();
const sessionsByToken = new Map<string, SessionRecord>();
const resetTokensByToken = new Map<string, ResetTokenRecord>();
const verificationTokensByToken = new Map<string, VerificationTokenRecord>();
let persistQueue: Promise<void> = Promise.resolve();
const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 30;

function isUserRecord(value: unknown): value is UserRecord {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.passwordSalt === 'string' &&
    typeof obj.passwordHash === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

// 既存ユーザーのフィールドが欠落している場合のマイグレーション
function migrateUserRecord(user: UserRecord): void {
  if (!user.authProvider) {
    (user as UserRecord).authProvider = 'email';
  }
  if (user.emailVerified === undefined) {
    (user as UserRecord).emailVerified = false;
  }
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.token === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.expiresAt === 'number'
  );
}

function isResetTokenRecord(value: unknown): value is ResetTokenRecord {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.token === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.expiresAt === 'number'
  );
}

function persistAuthState(): void {
  const snapshot: PersistedAuthState = {
    version: 1,
    users: [...usersById.values()],
    sessions: [...sessionsByToken.values()],
    resetTokens: [...resetTokensByToken.values()],
    verificationTokens: [...verificationTokensByToken.values()],
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(AUTH_STORE_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist auth store', { error: error instanceof Error ? error.message : String(error) });
    });
}

function hydrateAuthState(): void {
  const parsed = readJsonFile<PersistedAuthState>(
    AUTH_STORE_PATH,
    { version: 1, users: [], sessions: [], resetTokens: [] },
  );
  const now = Date.now();

  for (const user of parsed.users) {
    if (!isUserRecord(user)) continue;
    migrateUserRecord(user);
    const normalizedEmail = normalizeEmail(user.email);
    const normalizedUser: UserRecord = { ...user, email: normalizedEmail };
    usersByEmail.set(normalizedEmail, normalizedUser);
    usersById.set(normalizedUser.id, normalizedUser);
  }

  for (const session of parsed.sessions) {
    if (!isSessionRecord(session)) continue;
    if (session.expiresAt <= now) continue;
    if (!usersById.has(session.userId)) continue;
    sessionsByToken.set(session.token, session);
  }

  for (const resetToken of parsed.resetTokens) {
    if (!isResetTokenRecord(resetToken)) continue;
    if (resetToken.expiresAt <= now) continue;
    if (!usersById.has(resetToken.userId)) continue;
    resetTokensByToken.set(resetToken.token, resetToken);
  }

  for (const vToken of parsed.verificationTokens ?? []) {
    if (!isResetTokenRecord(vToken)) continue;
    if (vToken.expiresAt <= now) continue;
    if (!usersById.has(vToken.userId)) continue;
    verificationTokensByToken.set(vToken.token, vToken);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString('hex')}`;
}

function createToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

function toPublicUser(user: UserRecord): AuthPublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    authProvider: user.authProvider ?? 'email',
    emailVerified: user.emailVerified ?? false,
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const raw = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS) as Buffer;
  return raw.toString('hex');
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashPassword(password, salt);
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function createSession(userId: string): string {
  const token = createToken('sess');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessionsByToken.set(token, { token, userId, expiresAt });
  return token;
}

function invalidateSessionsForUser(userId: string): boolean {
  let changed = false;
  for (const [token, session] of sessionsByToken.entries()) {
    if (session.userId === userId) {
      sessionsByToken.delete(token);
      changed = true;
    }
  }
  return changed;
}

export async function registerUser(params: { name: string; email: string; password: string }): Promise<{ user: AuthPublicUser; token: string }> {
  const email = normalizeEmail(params.email);
  if (usersByEmail.has(email)) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const now = new Date().toISOString();
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(params.password, passwordSalt);
  const user: UserRecord = {
    id: createId('usr'),
    name: params.name.trim(),
    email,
    passwordSalt,
    passwordHash,
    authProvider: 'email',
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  usersByEmail.set(email, user);
  usersById.set(user.id, user);

  const token = createSession(user.id);
  persistAuthState();
  return { user: toPublicUser(user), token };
}

export async function loginUser(params: { email: string; password: string }): Promise<{ user: AuthPublicUser; token: string }> {
  const email = normalizeEmail(params.email);
  const user = usersByEmail.get(email);
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (user.authProvider === 'google' && !user.passwordHash) {
    throw new Error('USE_GOOGLE_LOGIN');
  }

  const isValidPassword = await verifyPassword(params.password, user.passwordSalt, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = createSession(user.id);
  persistAuthState();
  return { user: toPublicUser(user), token };
}

export function getUserBySessionToken(token: string): AuthPublicUser | null {
  const session = sessionsByToken.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessionsByToken.delete(token);
    persistAuthState();
    return null;
  }

  const user = usersById.get(session.userId);
  if (!user) {
    sessionsByToken.delete(token);
    persistAuthState();
    return null;
  }

  return toPublicUser(user);
}

export function logoutSession(token: string): void {
  const didDelete = sessionsByToken.delete(token);
  if (didDelete) {
    persistAuthState();
  }
}

export function requestPasswordReset(emailInput: string): string | null {
  const email = normalizeEmail(emailInput);
  const user = usersByEmail.get(email);
  if (!user) return null;

  const token = createToken('reset');
  resetTokensByToken.set(token, {
    token,
    userId: user.id,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });
  persistAuthState();
  return token;
}

export async function resetPassword(params: { token: string; newPassword: string }): Promise<{ user: AuthPublicUser; token: string }> {
  const record = resetTokensByToken.get(params.token);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) {
      resetTokensByToken.delete(params.token);
    }
    throw new Error('INVALID_RESET_TOKEN');
  }

  const user = usersById.get(record.userId);
  if (!user) {
    resetTokensByToken.delete(params.token);
    throw new Error('INVALID_RESET_TOKEN');
  }

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(params.newPassword, passwordSalt);
  user.passwordSalt = passwordSalt;
  user.passwordHash = passwordHash;
  user.updatedAt = new Date().toISOString();

  resetTokensByToken.delete(params.token);
  invalidateSessionsForUser(user.id);

  const token = createSession(user.id);
  persistAuthState();
  return { user: toPublicUser(user), token };
}

export function registerOrLoginWithGoogle(params: { email: string; name: string }): { user: AuthPublicUser; token: string } {
  const email = normalizeEmail(params.email);
  const existing = usersByEmail.get(email);

  if (existing) {
    if (existing.authProvider === 'email') {
      throw new Error('EMAIL_ACCOUNT_EXISTS');
    }
    const token = createSession(existing.id);
    persistAuthState();
    return { user: toPublicUser(existing), token };
  }

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: createId('usr'),
    name: params.name.trim(),
    email,
    passwordSalt: '',
    passwordHash: '',
    authProvider: 'google',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  };

  usersByEmail.set(email, user);
  usersById.set(user.id, user);

  const token = createSession(user.id);
  persistAuthState();
  return { user: toPublicUser(user), token };
}

export async function updateUserProfile(userId: string, params: { name: string }): Promise<AuthPublicUser> {
  const user = usersById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  user.name = params.name.trim();
  user.updatedAt = new Date().toISOString();
  persistAuthState();
  return toPublicUser(user);
}

export async function changeUserPassword(
  userId: string,
  params: { currentPassword: string; newPassword: string },
): Promise<{ token: string }> {
  const user = usersById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  if (user.authProvider === 'google' && !user.passwordHash) {
    throw new Error('GOOGLE_ONLY_ACCOUNT');
  }

  const isValid = await verifyPassword(params.currentPassword, user.passwordSalt, user.passwordHash);
  if (!isValid) throw new Error('INVALID_CURRENT_PASSWORD');

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(params.newPassword, passwordSalt);
  user.passwordSalt = passwordSalt;
  user.passwordHash = passwordHash;
  user.updatedAt = new Date().toISOString();

  invalidateSessionsForUser(user.id);
  const token = createSession(user.id);
  persistAuthState();
  return { token };
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  let changed = false;

  for (const [token, session] of sessionsByToken.entries()) {
    if (session.expiresAt <= now) {
      sessionsByToken.delete(token);
      changed = true;
    }
  }

  for (const [token, resetToken] of resetTokensByToken.entries()) {
    if (resetToken.expiresAt <= now) {
      resetTokensByToken.delete(token);
      changed = true;
    }
  }

  for (const [token, vToken] of verificationTokensByToken.entries()) {
    if (vToken.expiresAt <= now) {
      verificationTokensByToken.delete(token);
      changed = true;
    }
  }

  if (changed) {
    persistAuthState();
  }
}

export function createVerificationToken(userId: string): string {
  // Invalidate existing verification tokens for this user
  for (const [token, record] of verificationTokensByToken.entries()) {
    if (record.userId === userId) {
      verificationTokensByToken.delete(token);
    }
  }

  const token = createToken('verify');
  verificationTokensByToken.set(token, {
    token,
    userId,
    expiresAt: Date.now() + VERIFICATION_TOKEN_TTL_MS,
  });
  persistAuthState();
  return token;
}

export function verifyEmail(token: string): AuthPublicUser | null {
  const record = verificationTokensByToken.get(token);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) verificationTokensByToken.delete(token);
    return null;
  }

  const user = usersById.get(record.userId);
  if (!user) {
    verificationTokensByToken.delete(token);
    return null;
  }

  user.emailVerified = true;
  user.updatedAt = new Date().toISOString();
  verificationTokensByToken.delete(token);
  persistAuthState();
  return toPublicUser(user);
}

export function getUserEmailForVerification(userId: string): string | null {
  const user = usersById.get(userId);
  return user?.email ?? null;
}

export function getAllPublicUsers(): AuthPublicUser[] {
  return [...usersById.values()].map(toPublicUser);
}

export function getUserCreatedAt(userId: string): string | null {
  return usersById.get(userId)?.createdAt ?? null;
}

const MAX_SAVED_ADDRESSES = 3;

export function getSavedAddresses(userId: string): SavedAddress[] {
  const user = usersById.get(userId);
  return user?.savedAddresses ?? [];
}

export function addSavedAddress(userId: string, address: Omit<SavedAddress, 'id' | 'createdAt'>): SavedAddress {
  const user = usersById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  if (!user.savedAddresses) user.savedAddresses = [];

  if (user.savedAddresses.length >= MAX_SAVED_ADDRESSES) {
    throw new Error('MAX_ADDRESSES_REACHED');
  }

  // If this is set as default, unset others
  if (address.isDefault) {
    for (const addr of user.savedAddresses) {
      addr.isDefault = false;
    }
  }

  const saved: SavedAddress = {
    ...address,
    id: createId('addr'),
    createdAt: new Date().toISOString(),
  };

  user.savedAddresses.push(saved);
  user.updatedAt = new Date().toISOString();
  persistAuthState();
  return saved;
}

export function deleteSavedAddress(userId: string, addressId: string): boolean {
  const user = usersById.get(userId);
  if (!user || !user.savedAddresses) return false;

  const idx = user.savedAddresses.findIndex((a) => a.id === addressId);
  if (idx === -1) return false;

  user.savedAddresses.splice(idx, 1);
  user.updatedAt = new Date().toISOString();
  persistAuthState();
  return true;
}

hydrateAuthState();
setInterval(cleanupExpiredRecords, 60_000).unref();
