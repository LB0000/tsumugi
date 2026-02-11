import path from 'path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { readJsonFile, writeJsonAtomic } from './persistence.js';

const scrypt = promisify(scryptCallback);

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
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
}

interface PersistedAuthState {
  version: number;
  users: UserRecord[];
  sessions: SessionRecord[];
  resetTokens: ResetTokenRecord[];
}

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const AUTH_STORE_PATH = path.resolve(process.cwd(), 'server', '.data', 'auth-store.json');

const usersByEmail = new Map<string, UserRecord>();
const usersById = new Map<string, UserRecord>();
const sessionsByToken = new Map<string, SessionRecord>();
const resetTokensByToken = new Map<string, ResetTokenRecord>();
let persistQueue: Promise<void> = Promise.resolve();

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
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(AUTH_STORE_PATH, snapshot))
    .catch((error) => {
      console.error('Failed to persist auth store:', error);
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
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const raw = await scrypt(password, salt, 64) as Buffer;
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

  if (changed) {
    persistAuthState();
  }
}

hydrateAuthState();
setInterval(cleanupExpiredRecords, 60_000).unref();
