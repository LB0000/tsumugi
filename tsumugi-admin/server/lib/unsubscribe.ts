import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_UNSUBSCRIBE_BASE_URL = 'http://localhost:3002';
let hasWarnedMissingSecret = false;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getUnsubscribeSecret(): string | null {
  const secret = (config.MARKETING_UNSUBSCRIBE_SECRET || '').trim();
  if (secret.length >= 16) return secret;

  if (!hasWarnedMissingSecret) {
    hasWarnedMissingSecret = true;
    console.warn('[campaigns] MARKETING_UNSUBSCRIBE_SECRET is missing or too short (min 16 chars). Falling back to mailto unsubscribe links.');
  }
  return null;
}

function getSafeUnsubscribeBaseUrl(): string {
  const candidates = [
    config.MARKETING_UNSUBSCRIBE_BASE_URL,
    config.TSUMUGI_ADMIN_API_URL,
    config.FRONTEND_URL,
    DEFAULT_UNSUBSCRIBE_BASE_URL,
  ];

  for (const candidate of candidates) {
    const raw = (candidate || '').trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      // Continue to next candidate.
    }
  }

  return DEFAULT_UNSUBSCRIBE_BASE_URL;
}

function signPayload(email: string, expiresAt: number): string | null {
  const secret = getUnsubscribeSecret();
  if (!secret) return null;
  return createHmac('sha256', secret)
    .update(`${normalizeEmail(email)}:${expiresAt}`)
    .digest('hex');
}

export function createUnsubscribeToken(email: string): { email: string; expires: string; sig: string } | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const sig = signPayload(normalizedEmail, expiresAt);
  if (!sig) return null;

  return {
    email: normalizedEmail,
    expires: String(expiresAt),
    sig,
  };
}

export function verifyUnsubscribeToken(params: { email: string; expires: string; sig: string }): boolean {
  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail || !params.sig) return false;

  const expiresAt = Number(params.expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expectedSig = signPayload(normalizedEmail, expiresAt);
  if (!expectedSig) return false;

  const actual = Buffer.from(params.sig, 'hex');
  const expected = Buffer.from(expectedSig, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function createUnsubscribeUrl(email: string): string | null {
  const token = createUnsubscribeToken(email);
  if (!token) return null;

  const baseUrl = getSafeUnsubscribeBaseUrl();

  try {
    const url = new URL('/api/campaigns/unsubscribe', baseUrl);
    url.searchParams.set('email', token.email);
    url.searchParams.set('expires', token.expires);
    url.searchParams.set('sig', token.sig);
    return url.toString();
  } catch {
    return null;
  }
}
