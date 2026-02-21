import type { Router } from 'express';
import { z } from 'zod';
import { isValidEmail } from '../../lib/validation.js';
import { validate } from '../../lib/schemas.js';
import { logger } from '../../lib/logger.js';
import { sendOrderConfirmationEmail } from '../../lib/email.js';
import { scheduleReviewRequestEmail } from '../../lib/scheduledEmails.js';
import { sendPurchaseEvent } from '../../lib/metaConversions.js';
import { config } from '../../config.js';
import { claimCouponUsage, getOrderPaymentStatus, unclaimCouponUsage, updateOrderPaymentStatus } from '../../lib/checkoutState.js';
import { locationId, squareClient } from '../../lib/square.js';
import { useCoupon } from '../../lib/coupon.js';
import { parseCookies } from '../../lib/requestAuth.js';
import { handleSquareOrServerError, buildOrderPaymentStatusUpdate, makeIdempotencyKey, sanitizeReceiptUrl } from './helpers.js';

const processPaymentInputSchema = z.object({
  sourceId: z.string().min(1),
  orderId: z.string().min(1),
});

export function registerProcessPayment(router: Router) {
  router.post('/process-payment', async (req, res) => {
    try {
      const parsed = validate(processPaymentInputSchema, req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: '決済情報が不足しています' },
        });
        return;
      }

      const { buyerEmail, clientRequestId } = req.body as {
        buyerEmail?: string;
        clientRequestId?: string;
      };

      const normalizedSourceId = parsed.data.sourceId.trim();
      const normalizedOrderId = parsed.data.orderId.trim();

      const orderResponse = await squareClient.orders.get({ orderId: normalizedOrderId });
      const order = orderResponse.order;
      const orderAmount = order?.totalMoney?.amount ? BigInt(order.totalMoney.amount) : BigInt(0);

      if (!order || orderAmount <= BigInt(0)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ORDER', message: '注文情報の取得に失敗しました' },
        });
        return;
      }

      const idempotencySeed = typeof clientRequestId === 'string' && clientRequestId.trim().length > 0
        ? `${normalizedOrderId}:${clientRequestId.trim()}`
        : `${normalizedOrderId}:${normalizedSourceId}`;

      const normalizedBuyerEmail = typeof buyerEmail === 'string' && isValidEmail(buyerEmail.trim())
        ? buyerEmail.trim()
        : undefined;

      const response = await squareClient.payments.create({
        sourceId: normalizedSourceId,
        idempotencyKey: makeIdempotencyKey('payment', idempotencySeed),
        amountMoney: {
          amount: orderAmount,
          currency: 'JPY',
        },
        orderId: normalizedOrderId,
        locationId,
        buyerEmailAddress: normalizedBuyerEmail,
      });

      const payment = response.payment;
      if (!payment) {
        throw new Error('Payment creation failed: no payment returned');
      }
      const paymentId = payment.id;
      const paymentStatus = payment.status;
      if (typeof paymentId !== 'string' || typeof paymentStatus !== 'string') {
        throw new Error('Payment creation failed: invalid payment fields');
      }
      const sanitizedUrl = sanitizeReceiptUrl(payment.receiptUrl);

      const existingStatus = getOrderPaymentStatus(normalizedOrderId);
      let couponUsed = existingStatus?.couponUsed ?? false;

      if (paymentStatus === 'COMPLETED' && existingStatus?.couponCode && claimCouponUsage(normalizedOrderId)) {
        const used = await useCoupon(existingStatus.couponCode);
        if (!used) {
          unclaimCouponUsage(normalizedOrderId);
        }
        couponUsed = used;
      }

      const paymentStatusUpdatedAt = new Date().toISOString();
      updateOrderPaymentStatus(buildOrderPaymentStatusUpdate({
        orderId: normalizedOrderId,
        paymentId,
        paymentStatus,
        updatedAt: paymentStatusUpdatedAt,
        existingStatus,
        couponUsed,
        receiptUrl: payment.receiptUrl,
        fallbackTotalAmount: Number(orderAmount),
        fallbackCreatedAt: paymentStatusUpdatedAt,
      }));

      // Send emails and track events on successful payment
      if (paymentStatus === 'COMPLETED' && normalizedBuyerEmail) {
        void sendOrderConfirmationEmail(normalizedBuyerEmail, {
          orderId: normalizedOrderId,
          items: existingStatus?.items ?? [],
          totalAmount: Number(orderAmount),
          shippingAddress: existingStatus?.shippingAddress,
        }).catch((e) => logger.error('Failed to send order confirmation email', { error: (e as Error).message }));

        const buyerName = existingStatus?.shippingAddress
          ? `${existingStatus.shippingAddress.lastName} ${existingStatus.shippingAddress.firstName}`
          : '';
        if (buyerName) {
          scheduleReviewRequestEmail(normalizedBuyerEmail, normalizedOrderId, buyerName);
        }

        const contentIds = (existingStatus?.items ?? []).map((item: { productId: string }) => item.productId);
        const cookies = parseCookies(
          typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
        );
        void sendPurchaseEvent({
          eventId: `purchase-${normalizedOrderId}-${paymentId}`,
          orderId: normalizedOrderId,
          value: Number(orderAmount),
          currency: 'JPY',
          contentIds,
          userData: {
            email: normalizedBuyerEmail,
            phone: existingStatus?.shippingAddress?.phone,
            clientIpAddress: req.ip,
            clientUserAgent: req.headers['user-agent'] ?? undefined,
            fbc: cookies.get('_fbc'),
            fbp: cookies.get('_fbp'),
          },
          eventSourceUrl: req.headers.referer || config.FRONTEND_URL || undefined,
        }).catch((e) => logger.error('Failed to send Meta CAPI event', { error: (e as Error).message }));
      }

      res.json({
        success: true,
        paymentId,
        orderId: normalizedOrderId,
        status: paymentStatus,
        receiptUrl: sanitizedUrl,
      });
    } catch (error) {
      handleSquareOrServerError(res, error, 'PAYMENT_FAILED', '決済処理に失敗しました', req.requestId);
    }
  });
}
