import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('square', () => ({
  WebhooksHelper: { verifySignature: vi.fn() },
}));

vi.mock('../../lib/checkoutState.js', () => ({
  getOrderPaymentStatus: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  hasProcessedWebhookEvent: vi.fn(),
  markProcessedWebhookEvent: vi.fn(),
  claimCouponUsage: vi.fn(),
  unclaimCouponUsage: vi.fn(),
}));

vi.mock('../../lib/coupon.js', () => ({ useCoupon: vi.fn() }));
vi.mock('../../lib/lylyIntegration.js', () => ({ generatePDFForOrder: vi.fn() }));
vi.mock('../../lib/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import type { Router } from 'express';
import type { OrderPaymentStatus } from '../../lib/checkoutTypes.js';
import { registerWebhook } from '../../routes/checkout/webhook.js';
import { WebhooksHelper } from 'square';
import {
  getOrderPaymentStatus,
  hasProcessedWebhookEvent,
  markProcessedWebhookEvent,
  claimCouponUsage,
  unclaimCouponUsage,
} from '../../lib/checkoutState.js';
import { useCoupon } from '../../lib/coupon.js';
import { generatePDFForOrder } from '../../lib/lylyIntegration.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: { 'x-square-hmacsha256-signature': 'valid-sig' },
    rawBody: '{"type":"payment.completed"}',
    body: {
      type: 'payment.completed',
      event_id: 'evt-1',
      data: {
        object: {
          payment: {
            id: 'pay-1',
            orderId: 'order-1',
            status: 'COMPLETED',
          },
        },
      },
    },
    requestId: 'test-req-id',
    ...overrides,
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  return { res: { json: jsonFn, status: statusFn } as Partial<Response>, statusFn, jsonFn };
}

// ── Extract handler ────────────────────────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void>;
let handler: RouteHandler;

beforeAll(() => {
  const mockRouter = { post: vi.fn() } as unknown as Router;
  registerWebhook(mockRouter);
  handler = mockRouter.post.mock.calls[0][1];
});

const envBackup: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  envBackup.SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  envBackup.SQUARE_WEBHOOK_NOTIFICATION_URL = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test-sig-key';
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = 'https://test.com/webhook';
  vi.mocked(WebhooksHelper.verifySignature).mockResolvedValue(true);
  vi.mocked(hasProcessedWebhookEvent).mockReturnValue(false);
  vi.mocked(getOrderPaymentStatus).mockReturnValue({
    orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
    items: [{ productId: 'digital-data', name: 'データ', quantity: 1, price: 9800 }],
  } as OrderPaymentStatus);
});

afterEach(() => {
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = envBackup.SQUARE_WEBHOOK_SIGNATURE_KEY;
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = envBackup.SQUARE_WEBHOOK_NOTIFICATION_URL;
});

// ── Tests ──────────────────────────────────────────────

describe('webhook handler', () => {
  describe('signature validation', () => {
    it('returns 401 when signature header is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ headers: {} }), res);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_SIGNATURE' }),
      }));
    });

    it('returns 401 when env vars are missing', async () => {
      delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 400 when rawBody is missing', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq({ rawBody: undefined }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_WEBHOOK_PAYLOAD' }),
      }));
    });

    it('returns 401 when signature is invalid', async () => {
      vi.mocked(WebhooksHelper.verifySignature).mockResolvedValue(false);
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_SIGNATURE' }),
      }));
    });
  });

  describe('deduplication', () => {
    it('returns duplicate response for already processed events', async () => {
      vi.mocked(hasProcessedWebhookEvent).mockReturnValue(true);
      const { res } = mockRes();
      await handler(mockReq(), res);
      expect(res.json).toHaveBeenCalledWith({ success: true, duplicate: true });
    });
  });

  describe('payment processing', () => {
    it('processes payment.completed event correctly', async () => {
      const { res } = mockRes();
      await handler(mockReq(), res);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(markProcessedWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventId: 'evt-1',
        eventType: 'payment.completed',
        orderId: 'order-1',
        paymentId: 'pay-1',
        status: 'COMPLETED',
      }));
    });

    it('warns but succeeds when payment fields are missing', async () => {
      const req = mockReq({
        body: { type: 'payment.updated', event_id: 'evt-2', data: { object: {} } },
      });
      const { res } = mockRes();
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('triggers LYLY PDF generation on COMPLETED', async () => {
      vi.mocked(generatePDFForOrder).mockResolvedValue({ success: true, pdfUrl: 'https://pdf.test/1' } as Awaited<ReturnType<typeof generatePDFForOrder>>);
      const { res } = mockRes();
      await handler(mockReq(), res);
      // Allow async void to settle
      await new Promise(r => setTimeout(r, 50));
      expect(generatePDFForOrder).toHaveBeenCalled();
    });
  });

  describe('coupon handling', () => {
    it('claims and uses coupon on COMPLETED', async () => {
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        couponCode: 'SAVE10', couponUsed: false,
      } as OrderPaymentStatus);
      vi.mocked(claimCouponUsage).mockReturnValue(true);
      vi.mocked(useCoupon).mockResolvedValue(true);

      const { res } = mockRes();
      await handler(mockReq(), res);
      expect(claimCouponUsage).toHaveBeenCalledWith('order-1');
      expect(useCoupon).toHaveBeenCalledWith('SAVE10');
    });

    it('unclaims coupon when useCoupon fails', async () => {
      vi.mocked(getOrderPaymentStatus).mockReturnValue({
        orderId: 'order-1', paymentId: '', status: 'PENDING', updatedAt: '',
        couponCode: 'SAVE10', couponUsed: false,
      } as OrderPaymentStatus);
      vi.mocked(claimCouponUsage).mockReturnValue(true);
      vi.mocked(useCoupon).mockResolvedValue(false);

      const { res } = mockRes();
      await handler(mockReq(), res);
      expect(unclaimCouponUsage).toHaveBeenCalledWith('order-1');
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected exception', async () => {
      vi.mocked(WebhooksHelper.verifySignature).mockRejectedValue(new Error('Unexpected'));
      const { res, statusFn, jsonFn } = mockRes();
      await handler(mockReq(), res);
      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'WEBHOOK_PROCESSING_FAILED' }),
      }));
    });
  });
});
