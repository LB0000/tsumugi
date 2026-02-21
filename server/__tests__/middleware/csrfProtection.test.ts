import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──────────────────────────────────────────────

const mockEnv: Record<string, string | undefined> = {};

vi.mock('../../lib/requestAuth.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/requestAuth.js')>('../../lib/requestAuth.js');
  return {
    ...actual,
    isAllowedOrigin: vi.fn(actual.isAllowedOrigin),
    areTokensEqual: vi.fn(actual.areTokensEqual),
    extractCsrfTokenFromCookie: vi.fn(actual.extractCsrfTokenFromCookie),
    extractCsrfTokenFromHeader: vi.fn(actual.extractCsrfTokenFromHeader),
  };
});

import { csrfProtection } from '../../middleware/csrfProtection.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/api/checkout',
    headers: {},
    ...overrides,
  } as Request;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { res: { status: statusFn, json: jsonFn } as unknown as Response, statusFn, jsonFn };
}

function mockNext(): NextFunction {
  return vi.fn();
}

// ── Tests ──────────────────────────────────────────────

describe('csrfProtection', () => {
  let middleware: ReturnType<typeof csrfProtection>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('method bypass', () => {
    it('passes through GET requests', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res } = mockRes();
      middleware(mockReq({ method: 'GET' }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('passes through OPTIONS requests', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res } = mockRes();
      middleware(mockReq({ method: 'OPTIONS' }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('checks POST requests by default', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res, statusFn } = mockRes();
      // POST without any origin/csrf → should fail in production
      // But in test env NODE_ENV is 'test', isProduction is false
      // So isAllowedOrigin returns true for non-production
      middleware(mockReq({ method: 'POST', headers: {} }), res, next);
      // In non-production without origin, isAllowedOrigin returns true
      // Then falls to cookie check: no cookie/header → 403
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('respects custom methods option', () => {
      middleware = csrfProtection({ methods: ['PUT', 'DELETE'] });
      const next = mockNext();
      const { res } = mockRes();
      // POST should pass through since only PUT/DELETE are checked
      middleware(mockReq({ method: 'POST' }), res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('skipPaths', () => {
    it('skips specified paths', () => {
      middleware = csrfProtection({ skipPaths: ['/webhook'] });
      const next = mockNext();
      const { res } = mockRes();
      middleware(mockReq({ method: 'POST', path: '/webhook' }), res, next);
      expect(next).toHaveBeenCalled();
    });

    it('does not skip non-matching paths', () => {
      middleware = csrfProtection({ skipPaths: ['/webhook'] });
      const next = mockNext();
      const { res, statusFn } = mockRes();
      middleware(mockReq({ method: 'POST', path: '/api/checkout', headers: {} }), res, next);
      // Should proceed to CSRF check and fail (no cookie)
      expect(statusFn).toHaveBeenCalledWith(403);
    });
  });

  describe('cookie-based CSRF in development', () => {
    it('returns 403 when csrf cookie is missing', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res, statusFn, jsonFn } = mockRes();
      middleware(
        mockReq({
          method: 'POST',
          headers: { 'x-csrf-token': 'token123' } as any,
        }),
        res,
        next,
      );
      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' }),
        }),
      );
    });

    it('returns 403 when csrf header is missing', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res, statusFn } = mockRes();
      middleware(
        mockReq({
          method: 'POST',
          headers: { cookie: 'fable_csrf=token123' } as any,
        }),
        res,
        next,
      );
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('returns 403 when tokens do not match', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res, statusFn } = mockRes();
      middleware(
        mockReq({
          method: 'POST',
          headers: {
            cookie: 'fable_csrf=token-a',
            'x-csrf-token': 'token-b',
          } as any,
        }),
        res,
        next,
      );
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('passes when cookie and header tokens match', () => {
      middleware = csrfProtection();
      const next = mockNext();
      const { res } = mockRes();
      middleware(
        mockReq({
          method: 'POST',
          headers: {
            cookie: 'fable_csrf=valid-token',
            'x-csrf-token': 'valid-token',
          } as any,
        }),
        res,
        next,
      );
      expect(next).toHaveBeenCalled();
    });
  });
});
