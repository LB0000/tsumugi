import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response, Router } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../lib/catalog.js', () => ({
  SHIPPING_FLAT_FEE: 800,
  SHIPPING_FREE_THRESHOLD: 15000,
  DISCOUNT_RATE: 0.1,
  DISCOUNT_WINDOW_MS: 24 * 60 * 60 * 1000,
  catalogById: new Map([
    ['digital-data', { id: 'digital-data', name: 'デジタルデータ', price: 9800, requiresShipping: false }],
    ['canvas', { id: 'canvas', name: 'キャンバスアート', price: 19800, requiresShipping: true }],
    ['postcard', { id: 'postcard', name: 'ポストカード', price: 1500, requiresShipping: true }],
  ]),
}));

vi.mock('../../lib/validation.js', () => ({
  isValidEmail: vi.fn().mockReturnValue(true),
  validatePortraitName: vi.fn().mockImplementation((name: unknown) => typeof name === 'string' ? name : null),
  validateTextOverlaySettings: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/checkoutState.js', () => ({
  updateOrderPaymentStatus: vi.fn(),
}));

vi.mock('../../lib/auth.js', () => ({
  getUserBySessionToken: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/square.js', () => ({
  squareClient: {
    orders: { create: vi.fn() },
  },
  locationId: 'test-location',
}));

vi.mock('../../lib/coupon.js', () => ({
  validateCoupon: vi.fn().mockResolvedValue({ valid: false }),
  applyDiscount: vi.fn().mockImplementation((subtotal: number) => subtotal),
}));

vi.mock('../../lib/requestAuth.js', () => ({
  extractSessionTokenFromHeaders: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/imageStorage.js', () => ({
  uploadImageToStorage: vi.fn().mockResolvedValue({ success: true, publicUrl: 'https://storage.example.com/img.jpg', size: 1024 }),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../config.js', () => ({
  config: { FRONTEND_URL: 'https://test.com' },
}));

vi.mock('square', () => ({
  SquareError: class SquareError extends Error {
    statusCode: number;
    errors: Array<{ code: string }>;
    constructor(message: string, statusCode = 500, errors: Array<{ code: string }> = []) {
      super(message);
      this.statusCode = statusCode;
      this.errors = errors;
    }
  },
}));

import { registerCreateOrder } from '../../routes/checkout/createOrder.js';
import { squareClient } from '../../lib/square.js';
import { updateOrderPaymentStatus } from '../../lib/checkoutState.js';
import { isValidEmail } from '../../lib/validation.js';
import { validateCoupon, applyDiscount } from '../../lib/coupon.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(body: Record<string, unknown> = {}): Partial<Request> {
  return {
    body,
    headers: { cookie: '' } as Record<string, string>,
    ip: '127.0.0.1',
    requestId: 'test-req-id',
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return {
    res: { json: jsonFn, status: statusFn } as unknown as Response,
    statusFn,
    jsonFn,
  };
}

// ── Extract handler ────────────────────────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void>;
let handler: RouteHandler;

beforeAll(() => {
  const mockRouter = { post: vi.fn() } as unknown as Router;
  registerCreateOrder(mockRouter);
  handler = mockRouter.post.mock.calls[0][1];
});

beforeEach(() => {
  vi.clearAllMocks();

  // Default: Square returns valid order
  vi.mocked(squareClient.orders.create).mockResolvedValue({
    order: {
      id: 'order-test-1',
      totalMoney: { amount: BigInt(9800), currency: 'JPY' },
    },
  } as Awaited<ReturnType<typeof squareClient.orders.create>>);

  vi.mocked(isValidEmail).mockReturnValue(true);
  vi.mocked(validateCoupon).mockResolvedValue({ valid: false });
  vi.mocked(applyDiscount).mockImplementation((subtotal: number) => subtotal);
});

// ── Tests ──────────────────────────────────────────────

describe('createOrder handler', () => {
  describe('input validation', () => {
    it('returns 400 when items array is empty', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: [] }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'EMPTY_CART' }),
      }));
    });

    it('returns 400 when items is not an array', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: 'not-array' }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'EMPTY_CART' }),
      }));
    });

    it('returns 400 when too many items', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        productId: 'digital-data',
        quantity: 1,
      }));

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'TOO_MANY_ITEMS' }),
      }));
    });

    it('returns 400 when productId is empty', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: [{ productId: '', quantity: 1 }] }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_PRODUCT_ID' }),
      }));
    });

    it('returns 400 when quantity is zero', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: [{ productId: 'digital-data', quantity: 0 }] }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_QUANTITY' }),
      }));
    });

    it('returns 400 when quantity exceeds max', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: [{ productId: 'digital-data', quantity: 11 }] }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_QUANTITY' }),
      }));
    });

    it('returns 400 when product is unknown', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items: [{ productId: 'nonexistent', quantity: 1 }] }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNKNOWN_PRODUCT' }),
      }));
    });
  });

  describe('shipping validation', () => {
    it('returns 400 when shipping is required but address is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'canvas', quantity: 1 }],
      }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_SHIPPING_ADDRESS' }),
      }));
    });

    it('returns 400 when shipping address email is invalid', async () => {
      vi.mocked(isValidEmail).mockReturnValue(false);

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'canvas', quantity: 1 }],
        shippingAddress: {
          lastName: '田中',
          firstName: '太郎',
          email: 'invalid',
          phone: '09012345678',
          postalCode: '1000001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine: '1-1-1',
        },
      }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_EMAIL' }),
      }));
    });
  });

  describe('successful order creation', () => {
    it('creates order for digital product (no shipping)', async () => {
      const { res, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1 }],
      }), res);

      expect(squareClient.orders.create).toHaveBeenCalledTimes(1);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        orderId: 'order-test-1',
      }));
    });

    it('creates order for physical product with shipping address', async () => {
      const { res, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'canvas', quantity: 1 }],
        shippingAddress: {
          lastName: '田中',
          firstName: '太郎',
          email: 'test@example.com',
          phone: '09012345678',
          postalCode: '1000001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine: '1-1-1',
        },
      }), res);

      expect(squareClient.orders.create).toHaveBeenCalledTimes(1);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        orderId: 'order-test-1',
      }));
    });

    it('updates order payment status after creation', async () => {
      const { res } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1 }],
      }), res);

      expect(updateOrderPaymentStatus).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order-test-1',
        status: 'PENDING',
      }));
    });
  });

  describe('coupon handling', () => {
    it('applies valid coupon discount', async () => {
      vi.mocked(validateCoupon).mockResolvedValue({
        valid: true,
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 10,
      });
      vi.mocked(applyDiscount).mockReturnValue(8820);

      const { res, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1 }],
        couponCode: 'SAVE10',
      }), res);

      expect(validateCoupon).toHaveBeenCalledWith('SAVE10');
      expect(applyDiscount).toHaveBeenCalled();
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('ignores empty coupon code', async () => {
      const { res, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1 }],
        couponCode: '',
      }), res);

      expect(validateCoupon).not.toHaveBeenCalled();
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('image validation', () => {
    it('returns 400 when too many images', async () => {
      const items = Array.from({ length: 4 }, () => ({
        productId: 'digital-data',
        quantity: 1,
        imageData: 'data:image/png;base64,abc',
      }));

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ items }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'TOO_MANY_IMAGES' }),
      }));
    });

    it('returns 400 when image data is too large', async () => {
      const largeImage = 'x'.repeat(7_000_001);

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1, imageData: largeImage }],
      }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'IMAGE_TOO_LARGE' }),
      }));
    });
  });

  describe('error handling', () => {
    it('returns 500 when Square order creation fails', async () => {
      vi.mocked(squareClient.orders.create).mockRejectedValue(new Error('Square API error'));

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1 }],
      }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ORDER_CREATION_FAILED' }),
      }));
    });

    it('returns 400 for INVALID_PRICE error', async () => {
      // Simulate price that's out of valid range
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({
        items: [{ productId: 'digital-data', quantity: 1, price: 1 }],
      }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_PRICE' }),
      }));
    });
  });
});
