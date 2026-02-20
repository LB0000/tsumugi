import path from 'path';
import { randomBytes } from 'crypto';

import { logger } from './logger.js';
import { hashPassword, verifyPassword } from './auth/password.js';
import { initAddressManager, getSavedAddresses, addSavedAddress, deleteSavedAddress } from './auth/savedAddresses.js';
import { loadAuthStateSnapshot, persistAuthStateSnapshot } from './authStateStore.js';

// Re-export address functions for consumers that import from auth.js
export { getSavedAddresses, addSavedAddress, deleteSavedAddress };

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
const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 30;
const AUTH_STORE_PATH = path.resolve(process.cwd(), 'server', '.data', 'auth-store.json');

const usersByEmail = new Map<string, UserRecord>();
const usersById = new Map<string, UserRecord>();
const sessionsByToken = new Map<string, SessionRecord>();
const resetTokensByToken = new Map<string, ResetTokenRecord>();
const verificationTokensByToken = new Map<string, VerificationTokenRecord>();
let persistQueue: Promise<void> = Promise.resolve();

// --- Type guards ---

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

// --- Persistence ---

function persistAuthState(): void {
  const snapshot: PersistedAuthState = {
    version: 1,
    users: [...usersById.values()],
    sessions: [...sessionsByToken.values()],
    resetTokens: [...resetTokensByToken.values()],
    verificationTokens: [...verificationTokensByToken.values()],
  };

  persistQueue = persistQueue
    .then(() => persistAuthStateSnapshot(AUTH_STORE_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist auth store', { error: error instanceof Error ? error.message : String(error) });
    });
}

async function hydrateAuthState(): Promise<void> {
  const parsed = await loadAuthStateSnapshot<PersistedAuthState>(
    AUTH_STORE_PATH,
    { version: 1, users: [], sessions: [], resetTokens: [], verificationTokens: [] },
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

// --- Helpers ---

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

// --- Sessions ---

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

// --- Public API: User management ---

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

// --- Public API: Password reset ---

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
  const updatedUser = { ...user, passwordSalt, passwordHash, updatedAt: new Date().toISOString() };
  usersById.set(updatedUser.id, updatedUser);
  usersByEmail.set(updatedUser.email, updatedUser);

  resetTokensByToken.delete(params.token);
  invalidateSessionsForUser(updatedUser.id);

  const token = createSession(updatedUser.id);
  persistAuthState();
  return { user: toPublicUser(updatedUser), token };
}

// --- Public API: Google auth ---

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

// --- Public API: Profile ---

export async function updateUserProfile(userId: string, params: { name: string }): Promise<AuthPublicUser> {
  const user = usersById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  const updatedUser = { ...user, name: params.name.trim(), updatedAt: new Date().toISOString() };
  usersById.set(updatedUser.id, updatedUser);
  usersByEmail.set(updatedUser.email, updatedUser);
  persistAuthState();
  return toPublicUser(updatedUser);
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
  const updatedUser = { ...user, passwordSalt, passwordHash, updatedAt: new Date().toISOString() };
  usersById.set(updatedUser.id, updatedUser);
  usersByEmail.set(updatedUser.email, updatedUser);

  invalidateSessionsForUser(updatedUser.id);
  const token = createSession(updatedUser.id);
  persistAuthState();
  return { token };
}

// --- Public API: Email verification ---

export function createVerificationToken(userId: string): string {
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

  const updatedUser = { ...user, emailVerified: true, updatedAt: new Date().toISOString() };
  usersById.set(updatedUser.id, updatedUser);
  usersByEmail.set(updatedUser.email, updatedUser);
  verificationTokensByToken.delete(token);
  persistAuthState();
  return toPublicUser(updatedUser);
}

export function getUserEmailForVerification(userId: string): string | null {
  const user = usersById.get(userId);
  return user?.email ?? null;
}

// --- Public API: Admin queries ---

export function getAllPublicUsers(): AuthPublicUser[] {
  return [...usersById.values()].map(toPublicUser);
}

export function getUserCreatedAt(userId: string): string | null {
  return usersById.get(userId)?.createdAt ?? null;
}

// --- Cleanup ---

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

// --- Initialize ---

const HYDRATION_TIMEOUT_MS = 15_000;

{
  let timeoutId: ReturnType<typeof setTimeout>;
  await Promise.race([
    hydrateAuthState().then(() => clearTimeout(timeoutId)),
    new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Auth hydration timed out')), HYDRATION_TIMEOUT_MS);
    }),
  ]).catch((error) => {
    clearTimeout(timeoutId!);
    logger.error('Auth hydration failed or timed out, starting with empty state', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

// Wire up address manager with auth internals
initAddressManager({
  getUserById: (id) => usersById.get(id),
  createId,
  persistAuthState,
});

setInterval(cleanupExpiredRecords, 60_000).unref();
