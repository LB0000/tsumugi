import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../lib/auth.js', () => ({
  getUserBySessionToken: vi.fn(),
}));

vi.mock('../../lib/requestAuth.js', () => ({
  extractSessionTokenFromHeaders: vi.fn(),
}));

import { requireAuth, getAuthUser } from '../../middleware/requireAuth.js';
import { getUserBySessionToken } from '../../lib/auth.js';
import { extractSessionTokenFromHeaders } from '../../lib/requestAuth.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const locals: Record<string, unknown> = {};
  return {
    res: { status: statusFn, json: jsonFn, locals } as unknown as Response,
    statusFn,
    jsonFn,
    locals,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token is present', () => {
    vi.mocked(extractSessionTokenFromHeaders).mockReturnValue(null);
    const { res, statusFn, jsonFn } = mockRes();
    const next = vi.fn();

    requireAuth(mockReq(), res, next);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid (no user found)', () => {
    vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('invalid-token');
    vi.mocked(getUserBySessionToken).mockReturnValue(null);
    const { res, statusFn, jsonFn } = mockRes();
    const next = vi.fn();

    requireAuth(mockReq({ authorization: 'Bearer invalid-token' }), res, next);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('sets res.locals.user and calls next() on valid token', () => {
    const mockUser = { id: 'usr_abc', name: 'Test', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };
    vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('valid-token');
    vi.mocked(getUserBySessionToken).mockReturnValue(mockUser);
    const { res, locals } = mockRes();
    const next = vi.fn();

    requireAuth(mockReq({ authorization: 'Bearer valid-token' }), res, next);

    expect(next).toHaveBeenCalled();
    expect(locals.user).toEqual(mockUser);
  });
});

describe('getAuthUser', () => {
  it('returns user from res.locals', () => {
    const mockUser = { id: 'usr_abc', name: 'Test', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };
    const res = { locals: { user: mockUser } } as unknown as Response;
    expect(getAuthUser(res)).toEqual(mockUser);
  });
});
