import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuthUser: vi.fn(),
}));

vi.mock('../../middleware/csrfProtection.js', () => ({
  csrfProtection: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../lib/cartAbandonment.js', () => ({
  saveUserCart: vi.fn(),
  restoreUserCart: vi.fn(),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { cartRouter } from '../../routes/cart.js';
import { saveUserCart, restoreUserCart } from '../../lib/cartAbandonment.js';
import { getAuthUser } from '../../middleware/requireAuth.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): Partial<Request> {
  return {
    body: overrides.body ?? {},
    headers: { cookie: '' } as Record<string, string>,
    ip: '127.0.0.1',
    requestId: 'test-req-id',
    method: overrides.method ?? 'POST',
    ...overrides,
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return {
    res: { json: jsonFn, status: statusFn, locals: {} } as unknown as Response,
    statusFn,
    jsonFn,
  };
}

// ── Extract handlers ────────────────────────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void> | void;

function findHandler(method: string, path: string): RouteHandler {
  const stack = (cartRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: RouteHandler }> }; handle?: RouteHandler; name?: string }> }).stack;
  const routeLayer = stack.find(
    (layer) => layer.route?.path === path && layer.route?.methods?.[method],
  );

  if (!routeLayer?.route) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route on cartRouter`);
  }

  const handlers = routeLayer.route.stack;
  return handlers[handlers.length - 1].handle;
}

let saveHandler: RouteHandler;
let restoreHandler: RouteHandler;

beforeAll(() => {
  saveHandler = findHandler('post', '/save');
  restoreHandler = findHandler('get', '/restore');
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockReturnValue({
    id: 'usr_1',
    name: 'Test User',
    email: 'test@example.com',
    authProvider: 'email',
    emailVerified: true,
  });
});

// ── Tests ──────────────────────────────────────────────

describe('cart routes', () => {
  // ── POST /save ────────────────────────────────────────
  describe('POST /save', () => {
    it('returns 400 when items is not an array', () => {
      const { res, statusFn, jsonFn } = mockRes();
      saveHandler(mockReq({ body: { items: 'not-an-array' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ITEMS' }),
      }));
    });

    it('returns 400 when items is missing', () => {
      const { res, statusFn, jsonFn } = mockRes();
      saveHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ITEMS' }),
      }));
    });

    it('saves valid cart items', () => {
      const items = [
        { name: 'Canvas Art', price: 9800, quantity: 1 },
        { name: 'Postcard', price: 1500, quantity: 2 },
      ];

      const { res, jsonFn } = mockRes();
      saveHandler(mockReq({ body: { items } }), res);

      expect(saveUserCart).toHaveBeenCalledWith('usr_1', 'test@example.com', items);
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });

    it('filters out invalid items', () => {
      const items = [
        { name: 'Canvas Art', price: 9800, quantity: 1 },
        { name: 123, price: 'abc', quantity: 0 }, // invalid
      ];

      const { res, jsonFn } = mockRes();
      saveHandler(mockReq({ body: { items } }), res);

      expect(saveUserCart).toHaveBeenCalledWith(
        'usr_1',
        'test@example.com',
        [{ name: 'Canvas Art', price: 9800, quantity: 1 }],
      );
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });

    it('saves empty array when all items are invalid', () => {
      const items = [
        { name: 123, price: 'abc', quantity: 0 },
      ];

      const { res, jsonFn } = mockRes();
      saveHandler(mockReq({ body: { items } }), res);

      expect(saveUserCart).toHaveBeenCalledWith('usr_1', 'test@example.com', []);
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });

    it('returns 500 when saveUserCart throws', () => {
      vi.mocked(saveUserCart).mockImplementation(() => { throw new Error('STORAGE_ERROR'); });

      const { res, statusFn, jsonFn } = mockRes();
      saveHandler(mockReq({ body: { items: [] } }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'CART_SAVE_FAILED' }),
      }));
    });
  });

  // ── GET /restore ──────────────────────────────────────
  describe('GET /restore', () => {
    it('returns saved cart items', () => {
      const savedItems = [
        { name: 'Canvas Art', price: 9800, quantity: 1 },
      ];
      vi.mocked(restoreUserCart).mockReturnValue(savedItems);

      const { res, jsonFn } = mockRes();
      restoreHandler(mockReq({ method: 'GET' }), res);

      expect(restoreUserCart).toHaveBeenCalledWith('usr_1');
      expect(jsonFn).toHaveBeenCalledWith({ success: true, items: savedItems });
    });

    it('returns empty array when no saved cart', () => {
      vi.mocked(restoreUserCart).mockReturnValue(null);

      const { res, jsonFn } = mockRes();
      restoreHandler(mockReq({ method: 'GET' }), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, items: [] });
    });

    it('returns 500 when restoreUserCart throws', () => {
      vi.mocked(restoreUserCart).mockImplementation(() => { throw new Error('READ_ERROR'); });

      const { res, statusFn, jsonFn } = mockRes();
      restoreHandler(mockReq({ method: 'GET' }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'CART_RESTORE_FAILED' }),
      }));
    });
  });
});
