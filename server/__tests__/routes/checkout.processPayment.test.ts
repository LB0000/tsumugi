import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../lib/square.js', () => ({
  squareClient: {
    orders: { get: vi.fn() },
    payments: { create: vi.fn() },
  },
  locationId: 'test-location',
}));

vi.mock('../../lib/checkoutState.js', () => ({
  getOrderPaymentStatus: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  claimCouponUsage: vi.fn(),
  unclaimCouponUsage: vi.fn(),
}));

vi.mock('../../lib/coupon.js', () => ({ useCoupon: vi.fn() }));
vi.mock('../../lib/email.js', () => ({ sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/scheduledEmails.js', () => ({ scheduleReviewRequestEmail: vi.fn() }));
vi.mock('../../lib/metaConversions.js', () => ({ sendPurchaseEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../../config.js', () => ({ config: { FRONTEND_URL: 'https://test.com' } }));

import { registerProcessPayment } from '../../routes/checkout/processPayment.js';
import { squareClient } from '../../lib/square.js';
import { getOrderPaymentStatus, claimCouponUsage, unclaimCouponUsage } from '../../lib/checkoutState.js';
import { useCoupon } from '../../lib/coupon.js';
import { sendOrderConfirmationEmail } from '../../lib/email.js';
import { scheduleReviewRequestEmail } from '../../lib/scheduledEmails.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(body: Record<string, unknown> = {}): Partial<Request> {
  return { body, headers: { cookie: '' } as Record<string, string>, ip: '127.0.0.1', requestId: 'test-req-id' } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { res: { json: jsonFn, status: statusFn } as unknown as Response, statusFn, jsonFn };
}

// ── Extract handler ────────────────────────────────────

type RouteHandler = (req: any, res: any) => Promise<void>;
let handler: RouteHandler;

beforeAll(() => {
  const mockRouter = { post: vi.fn() } as any;
  registerProcessPayment(mockRouter);
  handler = mockRouter.post.mock.calls[0][1];
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────

describe('processPayment handler', () => {
  describe('input validation', () => {
    it('returns 400 when sourceId is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ orderId: 'order-1' }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });

    it('returns 400 when orderId is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ sourceId: 'src-1' }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });
  });

  describe('order validation', () => {
    it('returns 400 when order amount is 0', async () => {
      vi.mocked(squareClient.orders.get).mockResolvedValue({
        order: { id: 'order-1', totalMoney: { amount: BigInt(0), currency: 'JPY' } },
      } as any);

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ORDER' }),
      }));
    });
  });

  describe('successful payment', () => {
    const validBody = { sourceId: 'src-1', orderId: 'order-1', buyerEmail: 'test@example.com' };

    beforeEach(() => {
      vi.mocked(squareClient.orders.get).mockResolvedValue({
        order: { id: 'order-1', totalMoney: { amount: BigInt(9800), currency: 'JPY' } },
      } as any);
      vi.mocked(squareClient.payments.create).mockResolvedValue({
        payment: { id: 'pay-1', status: 'COMPLETED', receiptUrl: 'https://squareup.com/receipt/1' },
      } as any);
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        shippingAddress: { lastName: '田中', firstName: '太郎', email: 'test@example.com', phone: '090', postalCode: '100', prefecture: '東京', city: '千代田', addressLine: '1-1' },
        items: [{ productId: 'digital-data', name: 'データ', quantity: 1, price: 9800 }],
      } as any);
    });

    it('returns correct response shape for COMPLETED payment', async () => {
      const { res } = mockRes();
      await handler(mockReq(validBody), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentId: 'pay-1',
        orderId: 'order-1',
        status: 'COMPLETED',
      }));
    });

    it('sends confirmation email when COMPLETED + valid buyerEmail', async () => {
      const { res } = mockRes();
      await handler(mockReq(validBody), res);
      // Allow async void calls to settle
      await new Promise(r => setTimeout(r, 10));
      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });

    it('schedules review request email', async () => {
      const { res } = mockRes();
      await handler(mockReq(validBody), res);
      expect(scheduleReviewRequestEmail).toHaveBeenCalledWith('test@example.com', 'order-1', '田中 太郎');
    });

    it('does NOT send email when buyerEmail is missing', async () => {
      const { res } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    });

    it('does NOT send email when buyerEmail is invalid', async () => {
      const { res } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1', buyerEmail: 'not-email' }), res);
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('coupon handling', () => {
    beforeEach(() => {
      vi.mocked(squareClient.orders.get).mockResolvedValue({
        order: { id: 'order-1', totalMoney: { amount: BigInt(5000), currency: 'JPY' } },
      } as any);
      vi.mocked(squareClient.payments.create).mockResolvedValue({
        payment: { id: 'pay-1', status: 'COMPLETED', receiptUrl: undefined },
      } as any);
    });

    it('claims and uses coupon on COMPLETED when couponCode exists', async () => {
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        couponCode: 'SAVE10', couponUsed: false,
      } as any);
      vi.mocked(claimCouponUsage).mockReturnValue(true);
      vi.mocked(useCoupon).mockResolvedValue(true);

      const { res } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(claimCouponUsage).toHaveBeenCalledWith('order-1');
      expect(useCoupon).toHaveBeenCalledWith('SAVE10');
    });

    it('unclaims coupon when useCoupon returns false', async () => {
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        couponCode: 'SAVE10', couponUsed: false,
      } as any);
      vi.mocked(claimCouponUsage).mockReturnValue(true);
      vi.mocked(useCoupon).mockResolvedValue(false);

      const { res } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(unclaimCouponUsage).toHaveBeenCalledWith('order-1');
    });

    it('does not claim coupon when payment is not COMPLETED', async () => {
      vi.mocked(squareClient.payments.create).mockResolvedValue({
        payment: { id: 'pay-1', status: 'APPROVED', receiptUrl: undefined },
      } as any);
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        couponCode: 'SAVE10', couponUsed: false,
      } as any);

      const { res } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(claimCouponUsage).not.toHaveBeenCalled();
      expect(useCoupon).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns 500 on generic error', async () => {
      vi.mocked(squareClient.orders.get).mockRejectedValue(new Error('Something failed'));

      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ sourceId: 'src-1', orderId: 'order-1' }), res);
      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'PAYMENT_FAILED' }),
      }));
    });
  });
});
