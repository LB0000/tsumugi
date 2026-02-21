import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    MARKETING_UNSUBSCRIBE_SECRET: 'test-secret-1234567890',
    MARKETING_UNSUBSCRIBE_BASE_URL: '',
    TSUMUGI_ADMIN_API_URL: '',
    FRONTEND_URL: '',
    FROM_EMAIL: 'noreply@example.com',
  },
}));

vi.mock('../../config.js', () => ({ config: mockConfig }));

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  createUnsubscribeUrl,
} from '../../lib/unsubscribe.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.MARKETING_UNSUBSCRIBE_SECRET = 'test-secret-1234567890';
});

describe('createUnsubscribeToken', () => {
  it('creates token with email, expires, and sig', () => {
    const token = createUnsubscribeToken('user@example.com');
    expect(token).not.toBeNull();
    expect(token!.email).toBe('user@example.com');
    expect(token!.expires).toBeTruthy();
    expect(token!.sig).toBeTruthy();
    expect(Number(token!.expires)).toBeGreaterThan(Date.now());
  });

  it('normalizes email to lowercase', () => {
    const token = createUnsubscribeToken('User@EXAMPLE.com');
    expect(token!.email).toBe('user@example.com');
  });

  it('returns null for empty email', () => {
    expect(createUnsubscribeToken('')).toBeNull();
    expect(createUnsubscribeToken('  ')).toBeNull();
  });

  it('returns null when secret is not configured', () => {
    mockConfig.MARKETING_UNSUBSCRIBE_SECRET = '';
    expect(createUnsubscribeToken('user@example.com')).toBeNull();
  });

  it('returns null when secret is too short', () => {
    mockConfig.MARKETING_UNSUBSCRIBE_SECRET = 'short';
    expect(createUnsubscribeToken('user@example.com')).toBeNull();
  });
});

describe('verifyUnsubscribeToken', () => {
  it('returns true for valid token', () => {
    const token = createUnsubscribeToken('user@example.com')!;
    expect(verifyUnsubscribeToken(token)).toBe(true);
  });

  it('returns false for tampered signature', () => {
    const token = createUnsubscribeToken('user@example.com')!;
    token.sig = 'a'.repeat(64);
    expect(verifyUnsubscribeToken(token)).toBe(false);
  });

  it('returns false for tampered email', () => {
    const token = createUnsubscribeToken('user@example.com')!;
    token.email = 'other@example.com';
    expect(verifyUnsubscribeToken(token)).toBe(false);
  });

  it('returns false for expired token', () => {
    const token = createUnsubscribeToken('user@example.com')!;
    token.expires = String(Date.now() - 1000);
    expect(verifyUnsubscribeToken(token)).toBe(false);
  });

  it('returns false for empty email', () => {
    expect(verifyUnsubscribeToken({ email: '', expires: String(Date.now() + 60000), sig: 'abc' })).toBe(false);
  });

  it('returns false for empty sig', () => {
    expect(verifyUnsubscribeToken({ email: 'user@example.com', expires: String(Date.now() + 60000), sig: '' })).toBe(false);
  });

  it('returns false when secret is not configured', () => {
    const token = createUnsubscribeToken('user@example.com')!;
    mockConfig.MARKETING_UNSUBSCRIBE_SECRET = '';
    expect(verifyUnsubscribeToken(token)).toBe(false);
  });
});

describe('createUnsubscribeUrl', () => {
  it('creates URL with token params', () => {
    const url = createUnsubscribeUrl('user@example.com');
    expect(url).not.toBeNull();
    expect(url).toContain('/api/campaigns/unsubscribe');
    expect(url).toContain('email=user%40example.com');
    expect(url).toContain('expires=');
    expect(url).toContain('sig=');
  });

  it('uses default base URL when none configured', () => {
    const url = createUnsubscribeUrl('user@example.com');
    expect(url).toContain('http://localhost:3002');
  });

  it('returns null when secret is not configured', () => {
    mockConfig.MARKETING_UNSUBSCRIBE_SECRET = '';
    expect(createUnsubscribeUrl('user@example.com')).toBeNull();
  });
});
