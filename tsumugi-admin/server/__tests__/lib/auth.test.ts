import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    ADMIN_PASSWORD: 'test-password-12',
  },
}));

vi.mock('../../config.js', () => ({ config: mockConfig }));

import { login, logout, requireAuth } from '../../lib/auth.js';

function mockReq(authHeader?: string) {
  return { headers: { authorization: authHeader } } as import('express').Request;
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login', () => {
  it('returns token for correct password', () => {
    const token = login('test-password-12');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token!.length).toBe(64); // sha256 hex
  });

  it('returns null for wrong password', () => {
    const token = login('wrong-password-12');
    expect(token).toBeNull();
  });

  it('returns null for different length password', () => {
    const token = login('short');
    expect(token).toBeNull();
  });

  it('returns unique tokens for each login', () => {
    const token1 = login('test-password-12');
    const token2 = login('test-password-12');
    expect(token1).not.toBe(token2);
  });
});

describe('logout', () => {
  it('invalidates a valid session token', () => {
    const token = login('test-password-12')!;
    const next = vi.fn();

    // Token should work before logout
    requireAuth(mockReq(`Bearer ${token}`), mockRes(), next);
    expect(next).toHaveBeenCalled();

    // Logout
    logout(token);

    // Token should not work after logout
    const res = mockRes();
    const next2 = vi.fn();
    requireAuth(mockReq(`Bearer ${token}`), res, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireAuth', () => {
  it('returns 401 when no Authorization header', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth(mockReq('Basic abc123'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const res = mockRes();
    const next = vi.fn();
    requireAuth(mockReq('Bearer invalid-token'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for valid token', () => {
    const token = login('test-password-12')!;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(mockReq(`Bearer ${token}`), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
