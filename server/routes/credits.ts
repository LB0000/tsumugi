/**
 * Credits API routes
 * Handles credit balance queries, transaction history, and purchases
 */

import { createHash } from 'crypto';
import { Router, Request, Response } from 'express';
import { SquareError, WebhooksHelper } from 'square';
import { z } from 'zod';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import {
  getUserCredits,
  initializeUserCredits,
  getUserTransactions,
  addPurchasedCredits,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  trackPendingPayment,
  getPendingPayment,
  clearPendingPayment,
  isTestUser,
  registerTestUserIfNeeded,
} from '../lib/credits.js';
import { FREE_CREDITS, CREDITS_PER_PACK, PACK_PRICE_YEN, PRICE_PER_GENERATION, TEST_USER_DISPLAY_CREDITS } from '../lib/creditTypes.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { squareClient, locationId } from '../lib/square.js';
import { logger } from '../lib/logger.js';

// Extended Request interface for raw body (webhook signature verification)
interface RawBodyRequest extends Request {
  rawBody?: string;
}

export const creditsRouter = Router();
creditsRouter.use(csrfProtection({ skipPaths: ['/webhook'] }));

/**
 * GET /api/credits
 * Get current user's credit balance
 * Requires authentication
 */
creditsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const user = getAuthUser(res);
  registerTestUserIfNeeded(user.id, user.email);

  // Test users: return unlimited credits so frontend never shows charge modal
  if (isTestUser(user.id)) {
    res.json({
      success: true,
      credits: {
        freeRemaining: TEST_USER_DISPLAY_CREDITS,
        paidRemaining: 0,
        totalRemaining: TEST_USER_DISPLAY_CREDITS,
        totalUsed: 0,
      },
    });
    return;
  }

  let balance = getUserCredits(user.id);

  // Lazy initialization: if user has no credit record, create one
  if (!balance) {
    balance = initializeUserCredits(user.id);
  }

  res.json({
    success: true,
    credits: {
      freeRemaining: balance.freeRemaining,
      paidRemaining: balance.paidRemaining,
      totalRemaining: balance.freeRemaining + balance.paidRemaining,
      totalUsed: balance.totalUsed,
    },
  });
});

/**
 * GET /api/credits/transactions
 * Get current user's transaction history
 * Requires authentication
 */
creditsRouter.get('/transactions', requireAuth, (req: Request, res: Response) => {
  const user = getAuthUser(res);
  const transactions = getUserTransactions(user.id);

  res.json({
    success: true,
    transactions: transactions.map(txn => ({
      id: txn.id,
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      createdAt: txn.createdAt,
      referenceId: txn.referenceId,
    })),
  });
});

/**
 * GET /api/credits/pricing
 * Get pricing information (no auth required)
 */
creditsRouter.get('/pricing', (_req: Request, res: Response) => {
  res.json({
    success: true,
    pricing: {
      freeCredits: FREE_CREDITS,
      packCredits: CREDITS_PER_PACK,
      packPriceYen: PACK_PRICE_YEN,
      pricePerGeneration: PRICE_PER_GENERATION,
    },
  });
});

// ==================== Helper Functions ====================

/**
 * Generate deterministic idempotency key for Square API
 * Format: sha256(prefix:seed)[:24] to stay within Square's 45-char limit
 */
function makeIdempotencyKey(prefix: string, seed: string): string {
  const hash = createHash('sha256').update(`${prefix}:${seed}`).digest('hex');
  return `${prefix}_${hash.slice(0, 24)}`;
}

/**
 * Handle Square API errors with proper status codes and error messages
 */
function handleSquareOrServerError(
  res: Response,
  error: unknown,
  defaultCode: string,
  defaultMessage: string,
  requestId?: string,
) {
  if (error instanceof SquareError) {
    logger.error('Square API error', {
      statusCode: error.statusCode,
      errors: error.errors,
      requestId,
    });
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 502;
    res.status(status).json({
      success: false,
      error: { code: error.errors?.[0]?.code || defaultCode, message: defaultMessage },
    });
    return;
  }
  logger.error(defaultCode, { error: error instanceof Error ? error.message : String(error), requestId });
  res.status(500).json({
    success: false,
    error: { code: defaultCode, message: defaultMessage },
  });
}

// ==================== Webhook Endpoint ====================

/**
 * POST /api/credits/webhook
 * Handle Square payment webhook events for credit purchases
 * Processes payment.updated events to add credits on delayed payment completion
 */
creditsRouter.post('/webhook', async (req: RawBodyRequest, res: Response) => {
  try {
    // 1. Verify webhook signature
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

    // 2. Parse webhook event
    const rawEvent = req.body as Record<string, unknown> | undefined;
    const eventType = typeof rawEvent?.type === 'string' ? rawEvent.type : 'unknown';
    const eventId = typeof rawEvent?.event_id === 'string'
      ? rawEvent.event_id
      : typeof rawEvent?.eventId === 'string'
        ? rawEvent.eventId
        : '';

    // HIGH-3 FIX: Filter webhook events by type (only process payment events)
    const SUPPORTED_EVENT_TYPES = ['payment.updated', 'payment.created'];
    if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
      logger.info('Webhook event type not supported, skipping', { eventType, eventId });
      res.json({ success: true, skipped: 'unsupported_event_type' });
      return;
    }

    // 3. Idempotency check
    // HIGH-2 FIX: Empty eventId handled in hasProcessedWebhookEvent
    if (eventId && hasProcessedWebhookEvent(eventId)) {
      logger.info('Webhook event already processed (duplicate)', { eventType, eventId });
      res.json({ success: true, duplicate: true });
      return;
    }

    // 4. Extract payment data
    const data = rawEvent?.data as Record<string, unknown> | undefined;
    const object = data?.object as Record<string, unknown> | undefined;
    const payment = object?.payment as Record<string, unknown> | undefined;

    const paymentId = typeof payment?.id === 'string' ? payment.id : undefined;
    const paymentStatus = typeof payment?.status === 'string' ? payment.status : undefined;
    const note = typeof payment?.note === 'string' ? payment.note : undefined;

    // 5. Extract credit amount from payment note
    // Note format: "クレジット購入: 10回分"
    let credits: number | undefined;
    if (note) {
      const match = note.match(/クレジット購入:\s*(\d+)回分/);
      if (match) {
        credits = parseInt(match[1], 10);
      }
    }

    if (!paymentId || !paymentStatus) {
      logger.warn('Webhook missing required payment fields', {
        eventType,
        eventId,
        hasPaymentId: !!paymentId,
        hasPaymentStatus: !!paymentStatus,
      });
      res.json({ success: true, skipped: 'missing_payment_data' });
      return;
    }

    // 6. Process payment completion
    if (paymentStatus === 'COMPLETED' && paymentId) {
      const pendingPayment = getPendingPayment(paymentId);

      if (pendingPayment) {
        // Delayed payment completion - add credits now
        const { userId, credits: pendingCredits } = pendingPayment;

        try {
          addPurchasedCredits(userId, pendingCredits, paymentId);
          logger.info('Credits added via webhook for delayed payment completion', {
            userId,
            paymentId,
            credits: pendingCredits,
            eventId,
          });
          clearPendingPayment(paymentId);
        } catch (creditError) {
          logger.error('CRITICAL: Webhook payment completed but credit addition failed', {
            userId,
            paymentId,
            credits: pendingCredits,
            error: creditError instanceof Error ? creditError.message : String(creditError),
            eventId,
          });
          // Don't clear pending payment - allow retry on next webhook delivery
        }
      } else {
        // Payment already processed (immediate completion in purchase endpoint)
        logger.info('Webhook payment completion for already-processed payment', {
          paymentId,
          credits,
          eventId,
        });
      }
    }

    // 7. Mark event as processed
    if (eventId) {
      markWebhookEventProcessed(eventId);
    }

    res.json({ success: true, eventType, paymentStatus });
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { code: 'WEBHOOK_PROCESSING_ERROR', message: 'Webhook処理中にエラーが発生しました' },
    });
  }
});

// ==================== Purchase Endpoint ====================

/**
 * Input validation schema for credit purchase
 */
const purchaseCreditsInputSchema = z.object({
  sourceId: z.string().min(1), // Square Web Payments SDK source ID (card nonce)
  credits: z.number().int().positive().max(1000), // Number of credits to purchase
});

/**
 * POST /api/credits/purchase
 * Purchase credits via Square payment
 * Requires authentication
 */
creditsRouter.post('/purchase', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(res);

    // Validate input
    const result = purchaseCreditsInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '購入情報が不足しています' },
      });
      return;
    }

    const { sourceId, credits } = result.data;

    // Validate credits amount (only 10-credit pack for now)
    if (credits !== CREDITS_PER_PACK) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CREDIT_AMOUNT', message: `現在は${CREDITS_PER_PACK}クレジットパックのみ購入可能です` },
      });
      return;
    }

    const amountYen = (credits / CREDITS_PER_PACK) * PACK_PRICE_YEN;
    const amountMoney = {
      amount: BigInt(amountYen),
      currency: 'JPY' as const,
    };

    // Idempotency: Use userId + sourceId for deduplication
    const idempotencyKey = makeIdempotencyKey('credit-purchase', `${user.id}:${sourceId}`);

    // Create payment with Square
    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney,
      locationId,
      note: `クレジット購入: ${credits}回分`,
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

    logger.info('Credit purchase payment created', {
      userId: user.id,
      paymentId,
      paymentStatus,
      credits,
      amountYen,
      requestId: req.requestId,
    });

    // Track pending payment for webhook processing (in case of delayed completion)
    if (paymentStatus !== 'COMPLETED') {
      trackPendingPayment(paymentId, user.id, credits);
      logger.info('Payment pending, tracked for webhook processing', {
        userId: user.id,
        paymentId,
        paymentStatus,
      });
    }

    // Add purchased credits on successful payment
    if (paymentStatus === 'COMPLETED') {
      try {
        addPurchasedCredits(user.id, credits, paymentId);
        logger.info('Credits added to user balance (immediate completion)', {
          userId: user.id,
          paymentId,
          credits,
          requestId: req.requestId,
        });
      } catch (creditError) {
        // CRITICAL: Payment succeeded but credit addition failed
        // This requires manual reconciliation
        logger.error('CRITICAL: Payment succeeded but credit addition failed', {
          userId: user.id,
          paymentId,
          credits,
          error: creditError instanceof Error ? creditError.message : String(creditError),
          requestId: req.requestId,
        });
        // Track as pending so webhook can retry
        trackPendingPayment(paymentId, user.id, credits);
        // Still return success to user - they paid successfully
        // The addPurchasedCredits function is idempotent, so retry will work
      }
    }

    // Get updated balance
    const updatedBalance = getUserCredits(user.id);
    const totalRemaining = updatedBalance
      ? updatedBalance.freeRemaining + updatedBalance.paidRemaining
      : 0;

    res.json({
      success: true,
      paymentId,
      status: paymentStatus,
      creditsAdded: paymentStatus === 'COMPLETED' ? credits : 0,
      creditsRemaining: totalRemaining,
    });
  } catch (error) {
    handleSquareOrServerError(res, error, 'PAYMENT_FAILED', '決済処理に失敗しました', req.requestId);
  }
});
