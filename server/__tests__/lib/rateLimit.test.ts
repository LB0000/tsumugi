/**
 * Unit tests for rate limiter middleware
 * Tests createRateLimiter with various scenarios including window expiry, max capacity, and pruning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ── Imports ───────────────────────────────────────────

import { createRateLimiter } from '../../lib/rateLimit.js';
import { logger } from '../../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';

// ── Helpers ───────────────────────────────────────────

function createMockReq(ip: string = '127.0.0.1'): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as any,
  };
}

function createMockRes(): { res: Partial<Response>; headers: Record<string, string>; statusCode: number | null; jsonBody: any } {
  const state = {
    headers: {} as Record<string, string>,
    statusCode: null as number | null,
    jsonBody: null as any,
  };

  const res: Partial<Response> = {
    setHeader: vi.fn((name: string, value: string) => {
      state.headers[name] = value;
      return res as Response;
    }),
    status: vi.fn((code: number) => {
      state.statusCode = code;
      return res as Response;
    }),
    json: vi.fn((body: any) => {
      state.jsonBody = body;
      return res as Response;
    }),
  };

  return { res, ...state };
}

// ── Tests ─────────────────────────────────────────────

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within the limit', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 5, keyPrefix: 'test1' });
      const req = createMockReq('10.0.0.1');
      const { res } = createMockRes();
      const next = vi.fn();

      limiter(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should set rate limit headers on allowed requests', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 10, keyPrefix: 'test2' });
      const req = createMockReq('10.0.0.2');
      const mockRes = createMockRes();
      const next = vi.fn();

      limiter(req as Request, mockRes.res as Response, next as NextFunction);

      expect(mockRes.res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockRes.res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
    });

    it('should decrement remaining count on subsequent requests', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 5, keyPrefix: 'test3' });
      const req = createMockReq('10.0.0.3');
      const next = vi.fn();

      // First request
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);
      expect(mockRes1.res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');

      // Second request
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(mockRes2.res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '3');
    });

    it('should block requests when max is exceeded', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: 'test4' });
      const req = createMockReq('10.0.0.4');
      const next = vi.fn();

      // First request - allowed
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request - allowed
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request - blocked
      const mockRes3 = createMockRes();
      limiter(req as Request, mockRes3.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2); // not called again
      expect(mockRes3.res.status).toHaveBeenCalledWith(429);
      expect(mockRes3.res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        }),
      );
    });

    it('should set Retry-After header on blocked requests', () => {
      const limiter = createRateLimiter({ windowMs: 30000, max: 1, keyPrefix: 'test5' });
      const req = createMockReq('10.0.0.5');
      const next = vi.fn();

      // First request - allowed
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);

      // Second request - blocked
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(mockRes2.res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should reset the bucket after windowMs expires', () => {
      const limiter = createRateLimiter({ windowMs: 10000, max: 1, keyPrefix: 'test6' });
      const req = createMockReq('10.0.0.6');
      const next = vi.fn();

      // First request - allowed
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request - blocked
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // Advance time past the window
      vi.advanceTimersByTime(11000);

      // Third request - allowed (window expired)
      const mockRes3 = createMockRes();
      limiter(req as Request, mockRes3.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should track different IPs separately', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 1, keyPrefix: 'test7' });
      const next = vi.fn();

      // IP 1 - allowed
      const req1 = createMockReq('192.168.1.1');
      const mockRes1 = createMockRes();
      limiter(req1 as Request, mockRes1.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // IP 2 - allowed (different IP, separate bucket)
      const req2 = createMockReq('192.168.1.2');
      const mockRes2 = createMockRes();
      limiter(req2 as Request, mockRes2.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);

      // IP 1 again - blocked
      const mockRes3 = createMockRes();
      limiter(req1 as Request, mockRes3.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should use different keyPrefixes for separate limiters', () => {
      const limiterA = createRateLimiter({ windowMs: 60000, max: 1, keyPrefix: 'apiA' });
      const limiterB = createRateLimiter({ windowMs: 60000, max: 1, keyPrefix: 'apiB' });
      const req = createMockReq('10.0.0.8');
      const next = vi.fn();

      // Limiter A - first request allowed
      const mockRes1 = createMockRes();
      limiterA(req as Request, mockRes1.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);

      // Limiter B - first request allowed (different prefix)
      const mockRes2 = createMockRes();
      limiterB(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should use socket.remoteAddress when req.ip is undefined', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: 'test9' });
      const req: Partial<Request> = {
        ip: undefined as any,
        socket: { remoteAddress: '10.0.0.9' } as any,
      };
      const { res } = createMockRes();
      const next = vi.fn();

      limiter(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should use "unknown" when both req.ip and socket.remoteAddress are absent', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: 'test10' });
      const req: Partial<Request> = {
        ip: undefined as any,
        socket: { remoteAddress: undefined } as any,
      };
      const { res } = createMockRes();
      const next = vi.fn();

      limiter(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should show remaining as 0 when exactly at max', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 2, keyPrefix: 'test11' });
      const req = createMockReq('10.0.0.11');
      const next = vi.fn();

      // First request
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);

      // Second request (at max)
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(mockRes2.res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should return 429 error message in Japanese', () => {
      const limiter = createRateLimiter({ windowMs: 60000, max: 1, keyPrefix: 'test12' });
      const req = createMockReq('10.0.0.12');
      const next = vi.fn();

      // Exhaust limit
      const mockRes1 = createMockRes();
      limiter(req as Request, mockRes1.res as Response, next as NextFunction);

      // Blocked
      const mockRes2 = createMockRes();
      limiter(req as Request, mockRes2.res as Response, next as NextFunction);
      expect(mockRes2.res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('リクエストが多すぎます'),
          }),
        }),
      );
    });
  });
});
