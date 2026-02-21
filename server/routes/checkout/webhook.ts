import type { Router, Request } from 'express';
import { WebhooksHelper } from 'square';
import { logger } from '../../lib/logger.js';
import {
  claimCouponUsage,
  getOrderPaymentStatus,
  hasProcessedWebhookEvent,
  markProcessedWebhookEvent,
  unclaimCouponUsage,
  updateOrderPaymentStatus,
} from '../../lib/checkoutState.js';
import { useCoupon } from '../../lib/coupon.js';
import { generatePDFForOrder } from '../../lib/lylyIntegration.js';
import { buildOrderPaymentStatusUpdate } from './helpers.js';

interface RawBodyRequest extends Request {
  rawBody?: string;
}

export function registerWebhook(router: Router) {
  router.post('/webhook', async (req: RawBodyRequest, res) => {
    try {
      const signatureHeaderRaw = req.headers['x-square-hmacsha256-signature'];
      const signatureHeader = Array.isArray(signatureHeaderRaw) ? signatureHeaderRaw[0] : signatureHeaderRaw;

      if (!signatureHeader) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: '署名ヘッダーがありません' },
        });
        return;
      }

      const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
      if (!signatureKey || !notificationUrl) {
        logger.error('Webhook signature key or notification URL not configured');
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: '署名の検証に失敗しました' },
        });
        return;
      }

      const requestBody = req.rawBody;
      if (!requestBody) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_WEBHOOK_PAYLOAD', message: 'Webhookボディの取得に失敗しました' },
        });
        return;
      }

      const isValidSignature = await WebhooksHelper.verifySignature({
        requestBody,
        signatureHeader,
        signatureKey,
        notificationUrl,
      });

      if (!isValidSignature) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Webhook署名が無効です' },
        });
        return;
      }

      const rawEvent = req.body as Record<string, unknown> | undefined;
      const eventType = typeof rawEvent?.type === 'string' ? rawEvent.type : 'unknown';
      const eventId = typeof rawEvent?.event_id === 'string'
        ? rawEvent.event_id
        : typeof rawEvent?.eventId === 'string'
          ? rawEvent.eventId
          : '';

      if (eventId && hasProcessedWebhookEvent(eventId)) {
        res.json({ success: true, duplicate: true });
        return;
      }

      const data = rawEvent?.data as Record<string, unknown> | undefined;
      const object = data?.object as Record<string, unknown> | undefined;
      const payment = object?.payment as Record<string, unknown> | undefined;

      const paymentId = typeof payment?.id === 'string' ? payment.id : undefined;
      const orderId = typeof payment?.orderId === 'string'
        ? payment.orderId
        : typeof payment?.order_id === 'string'
          ? payment.order_id
          : undefined;
      const paymentStatus = typeof payment?.status === 'string' ? payment.status : undefined;

      if (!orderId || !paymentId || !paymentStatus) {
        logger.warn('Webhook missing required fields', { eventType, eventId, hasOrderId: !!orderId, hasPaymentId: !!paymentId, hasPaymentStatus: !!paymentStatus });
      }

      if (orderId && paymentId && paymentStatus) {
        const existingStatus = getOrderPaymentStatus(orderId);
        let couponUsed = existingStatus?.couponUsed ?? false;

        if (paymentStatus === 'COMPLETED' && existingStatus?.couponCode && claimCouponUsage(orderId)) {
          const used = await useCoupon(existingStatus.couponCode);
          if (!used) {
            unclaimCouponUsage(orderId);
          }
          couponUsed = used;
        }

        updateOrderPaymentStatus(buildOrderPaymentStatusUpdate({
          orderId,
          paymentId,
          paymentStatus,
          updatedAt: new Date().toISOString(),
          existingStatus,
          couponUsed,
        }));

        // Generate LYLY PDF on payment completion (non-blocking)
        if (paymentStatus === 'COMPLETED' && existingStatus) {
          void (async () => {
            try {
              logger.info('Starting LYLY PDF generation', { orderId });

              const latestStatus = getOrderPaymentStatus(orderId);
              if (latestStatus) {
                updateOrderPaymentStatus({
                  ...latestStatus,
                  printDataStatus: 'processing',
                });
              }

              const result = await generatePDFForOrder(existingStatus);

              if (result.success && result.pdfUrl) {
                updateOrderPaymentStatus({
                  ...getOrderPaymentStatus(orderId)!,
                  printDataUrl: result.pdfUrl,
                  printDataStatus: 'completed',
                  printDataError: undefined,
                });
                logger.info('LYLY PDF generation succeeded', { orderId, pdfUrl: result.pdfUrl });
              } else {
                updateOrderPaymentStatus({
                  ...getOrderPaymentStatus(orderId)!,
                  printDataStatus: 'failed',
                  printDataError: result.errors?.join('; ') || 'Unknown error',
                });
                logger.error('LYLY PDF generation failed', { orderId, errors: result.errors });
              }
            } catch (error) {
              logger.error('LYLY PDF generation exception', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
              });
              const currentStatus = getOrderPaymentStatus(orderId);
              if (currentStatus) {
                updateOrderPaymentStatus({
                  ...currentStatus,
                  printDataStatus: 'failed',
                  printDataError: error instanceof Error ? error.message : 'Unknown exception',
                });
              }
            }
          })();
        }
      }

      if (eventId) {
        markProcessedWebhookEvent({
          eventId,
          eventType,
          receivedAt: new Date().toISOString(),
          orderId,
          paymentId,
          status: paymentStatus,
        });
      }

      logger.info('Square webhook processed', { eventType, eventId, orderId, paymentStatus, requestId: req.requestId });
      res.json({ success: true });
    } catch (error) {
      logger.error('Webhook processing error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: { code: 'WEBHOOK_PROCESSING_FAILED', message: 'Webhook処理に失敗しました' },
      });
    }
  });
}
