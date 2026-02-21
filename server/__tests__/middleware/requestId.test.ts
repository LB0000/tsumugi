import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from '../../middleware/requestId.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers, requestId: undefined } as unknown as Request;
}

function mockRes() {
  const setHeaderFn = vi.fn();
  return { res: { setHeader: setHeaderFn } as unknown as Response, setHeaderFn };
}

// ── Tests ──────────────────────────────────────────────

describe('requestIdMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a UUID when x-request-id header is absent', () => {
    const req = mockReq();
    const { res, setHeaderFn } = mockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(setHeaderFn).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('uses x-request-id header when provided', () => {
    const req = mockReq({ 'x-request-id': 'custom-id-123' });
    const { res, setHeaderFn } = mockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('custom-id-123');
    expect(setHeaderFn).toHaveBeenCalledWith('X-Request-ID', 'custom-id-123');
    expect(next).toHaveBeenCalled();
  });

  it('sets response header to match request ID', () => {
    const req = mockReq();
    const { res, setHeaderFn } = mockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(setHeaderFn).toHaveBeenCalledWith('X-Request-ID', req.requestId);
  });
});
