import { createHash } from 'crypto';
import { Router } from 'express';
import type { Request } from 'express';
import { SquareError, WebhooksHelper } from 'square';
import { SHIPPING_FLAT_FEE, SHIPPING_FREE_THRESHOLD, catalogById } from '../lib/catalog.js';
import { isValidEmail } from '../lib/validation.js';
import { validate } from '../lib/schemas.js';
import { z } from 'zod';

const processPaymentInputSchema = z.object({
  sourceId: z.string().min(1),
  orderId: z.string().min(1),
});
import {
  getOrderPaymentStatus,
  getOrdersByUserId,
  hasProcessedWebhookEvent,
  markProcessedWebhookEvent,
  updateOrderPaymentStatus,
} from '../lib/checkoutState.js';
import { getUserBySessionToken } from '../lib/auth.js';
import { locationId, squareClient } from '../lib/square.js';
import { validateCoupon, applyDiscount, useCoupon } from '../lib/coupon.js';
import { extractSessionTokenFromHeaders, type HeaderMap } from '../lib/requestAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';

export const checkoutRouter = Router();
checkoutRouter.use(csrfProtection({ skipPaths: ['/webhook'] }));

function handleSquareOrServerError(
  res: Parameters<Parameters<typeof checkoutRouter.post>[1]>[1],
  error: unknown,
  defaultCode: string,
  defaultMessage: string,
) {
  if (error instanceof SquareError) {
    console.error('Square API details:', {
      statusCode: error.statusCode,
      errors: error.errors,
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
  console.error(`${defaultCode}:`, error);
  res.status(500).json({
    success: false,
    error: { code: defaultCode, message: defaultMessage },
  });
}

interface CartItemPayload {
  productId: string;
  quantity: number;
}

export interface ShippingAddressPayload {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
}

interface RawBodyRequest extends Request {
  rawBody?: string;
}

const MAX_ITEM_QUANTITY = 10;

export function sanitizeReceiptUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function sanitizePaymentStatusReceipt<T extends { receiptUrl?: string }>(status: T): T {
  const sanitizedReceiptUrl = sanitizeReceiptUrl(status.receiptUrl);
  if (!sanitizedReceiptUrl) {
    const { receiptUrl: _unsafe, ...rest } = status;
    return rest as T;
  }
  return { ...status, receiptUrl: sanitizedReceiptUrl };
}

export function makeIdempotencyKey(prefix: string, seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 36);
  return `${prefix}-${hash}`;
}

export function normalizeShippingAddress(address?: Partial<ShippingAddressPayload>): ShippingAddressPayload | null {
  if (!address) return null;

  const normalized = {
    lastName: address.lastName?.trim() ?? '',
    firstName: address.firstName?.trim() ?? '',
    email: address.email?.trim() ?? '',
    phone: address.phone?.trim() ?? '',
    postalCode: address.postalCode?.trim() ?? '',
    prefecture: address.prefecture?.trim() ?? '',
    city: address.city?.trim() ?? '',
    addressLine: address.addressLine?.trim() ?? '',
  };

  const requiredValues = Object.values(normalized);
  if (requiredValues.some((value) => value.length === 0)) {
    return null;
  }

  return normalized;
}

// POST /api/checkout/create-order
checkoutRouter.post('/create-order', async (req, res) => {
  try {
    const { items, shippingAddress, clientRequestId, couponCode } = req.body as {
      items: CartItemPayload[];
      shippingAddress?: Partial<ShippingAddressPayload>;
      clientRequestId?: string;
      couponCode?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CART', message: 'カートが空です' },
      });
      return;
    }

    if (items.length > 20) {
      res.status(400).json({
        success: false,
        error: { code: 'TOO_MANY_ITEMS', message: '一度に注文できる商品数を超えています' },
      });
      return;
    }

    let subtotal = 0;
    let requiresShipping = false;
    const normalizedItems = items.map((item) => {
      if (typeof item?.productId !== 'string' || item.productId.trim().length === 0) {
        throw new Error('INVALID_PRODUCT_ID');
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        throw new Error('INVALID_QUANTITY');
      }

      const catalogItem = catalogById.get(item.productId);
      if (!catalogItem) {
        throw new Error('UNKNOWN_PRODUCT');
      }

      subtotal += catalogItem.price * quantity;
      requiresShipping = requiresShipping || catalogItem.requiresShipping;

      return {
        productId: catalogItem.id,
        name: catalogItem.name,
        quantity,
        price: catalogItem.price,
      };
    });

    if (subtotal <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOTAL', message: '不正な注文金額です' },
      });
      return;
    }

    const normalizedAddress = normalizeShippingAddress(shippingAddress);
    if (requiresShipping && !normalizedAddress) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SHIPPING_ADDRESS', message: '配送先情報が不足しています' },
      });
      return;
    }

    if (normalizedAddress && !isValidEmail(normalizedAddress.email)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
      });
      return;
    }

    // Validate coupon if provided
    let appliedCoupon: { code: string; discountType: 'percentage' | 'fixed'; discountValue: number } | null = null;
    if (typeof couponCode === 'string' && couponCode.trim().length > 0) {
      const couponResult = await validateCoupon(couponCode);
      if (couponResult.valid && couponResult.discountType && couponResult.discountValue !== undefined) {
        appliedCoupon = {
          code: couponResult.code!,
          discountType: couponResult.discountType,
          discountValue: couponResult.discountValue,
        };
      }
      // Silently ignore invalid coupons -- don't block the order
    }

    const discountedSubtotal = appliedCoupon
      ? applyDiscount(subtotal, appliedCoupon.discountType, appliedCoupon.discountValue)
      : subtotal;

    const shippingCost = requiresShipping && discountedSubtotal < SHIPPING_FREE_THRESHOLD ? SHIPPING_FLAT_FEE : 0;

    const lineItems = normalizedItems.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(item.price),
        currency: 'JPY' as const,
      },
      metadata: {
        productId: item.productId,
      },
    }));

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        name: '送料',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(shippingCost),
          currency: 'JPY' as const,
        },
        metadata: {
          productId: 'shipping',
        },
      });
    }

    const idempotencySeed = typeof clientRequestId === 'string' && clientRequestId.trim().length > 0
      ? clientRequestId.trim()
      : JSON.stringify({
          items: normalizedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          shippingAddress: normalizedAddress,
        });

    // Build Square discount if coupon is applied
    const discounts = appliedCoupon ? [{
      name: `クーポン: ${appliedCoupon.code}`,
      type: 'FIXED_AMOUNT' as const,
      amountMoney: {
        amount: BigInt(subtotal - discountedSubtotal),
        currency: 'JPY' as const,
      },
      scope: 'ORDER' as const,
    }] : undefined;

    const response = await squareClient.orders.create({
      order: {
        locationId,
        lineItems,
        ...(discounts && { discounts }),
        ...(normalizedAddress && {
          fulfillments: [
            {
              type: 'SHIPMENT',
              state: 'PROPOSED',
              shipmentDetails: {
                recipient: {
                  displayName: `${normalizedAddress.lastName} ${normalizedAddress.firstName}`,
                  emailAddress: normalizedAddress.email,
                  phoneNumber: normalizedAddress.phone,
                  address: {
                    postalCode: normalizedAddress.postalCode,
                    administrativeDistrictLevel1: normalizedAddress.prefecture,
                    locality: normalizedAddress.city,
                    addressLine1: normalizedAddress.addressLine,
                    country: 'JP',
                  },
                },
              },
            },
          ],
        }),
      },
      idempotencyKey: makeIdempotencyKey('order', idempotencySeed),
    });

    const order = response.order;
    if (!order) {
      throw new Error('Order creation failed: no order returned');
    }

    // Link order to user if logged in
    const sessionToken = extractSessionTokenFromHeaders(req.headers as HeaderMap);
    const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
    const totalAmount = Number(order.totalMoney?.amount ?? 0);

    if (order.id) {
      updateOrderPaymentStatus({
        orderId: order.id,
        paymentId: '',
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
        userId: sessionUser?.id,
        totalAmount,
        createdAt: new Date().toISOString(),
        items: normalizedItems,
        shippingAddress: normalizedAddress ?? undefined,
        couponCode: appliedCoupon?.code,
      });
    }

    res.json({
      success: true,
      orderId: order.id,
      totalAmount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PRODUCT_ID') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRODUCT_ID', message: '商品情報が不正です' },
      });
      return;
    }

    if (error instanceof Error && error.message === 'INVALID_QUANTITY') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUANTITY', message: '数量が不正です' },
      });
      return;
    }

    if (error instanceof Error && error.message === 'UNKNOWN_PRODUCT') {
      res.status(400).json({
        success: false,
        error: { code: 'UNKNOWN_PRODUCT', message: '存在しない商品が含まれています' },
      });
      return;
    }

    handleSquareOrServerError(res, error, 'ORDER_CREATION_FAILED', '注文の作成に失敗しました');
  }
});

// POST /api/checkout/process-payment
checkoutRouter.post('/process-payment', async (req, res) => {
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
    const sanitizedReceiptUrl = sanitizeReceiptUrl(payment.receiptUrl);

    // Preserve existing fields when updating payment status
    const existingStatus = getOrderPaymentStatus(normalizedOrderId);
    let couponUsed = existingStatus?.couponUsed ?? false;

    // Mark coupon as used on successful payment
    if (paymentStatus === 'COMPLETED' && existingStatus?.couponCode && !existingStatus.couponUsed) {
      couponUsed = await useCoupon(existingStatus.couponCode);
    }

    updateOrderPaymentStatus({
      orderId: normalizedOrderId,
      paymentId,
      status: paymentStatus,
      updatedAt: new Date().toISOString(),
      userId: existingStatus?.userId,
      totalAmount: existingStatus?.totalAmount ?? Number(orderAmount),
      createdAt: existingStatus?.createdAt ?? new Date().toISOString(),
      items: existingStatus?.items,
      shippingAddress: existingStatus?.shippingAddress,
      receiptUrl: sanitizedReceiptUrl ?? sanitizeReceiptUrl(existingStatus?.receiptUrl),
      couponCode: existingStatus?.couponCode,
      couponUsed,
    });

    res.json({
      success: true,
      paymentId,
      orderId: normalizedOrderId,
      status: paymentStatus,
      receiptUrl: sanitizedReceiptUrl,
    });
  } catch (error) {
    handleSquareOrServerError(res, error, 'PAYMENT_FAILED', '決済処理に失敗しました');
  }
});

// POST /api/checkout/webhook
checkoutRouter.post('/webhook', async (req: RawBodyRequest, res) => {
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
      res.status(500).json({
        success: false,
        error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook設定が不足しています' },
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

    if (orderId && paymentId && paymentStatus) {
      const existingStatus = getOrderPaymentStatus(orderId);
      let couponUsed = existingStatus?.couponUsed ?? false;

      // Fallback: mark coupon as used via webhook if not already done
      if (paymentStatus === 'COMPLETED' && existingStatus?.couponCode && !existingStatus.couponUsed) {
        couponUsed = await useCoupon(existingStatus.couponCode);
      }

      updateOrderPaymentStatus({
        orderId,
        paymentId,
        status: paymentStatus,
        updatedAt: new Date().toISOString(),
        userId: existingStatus?.userId,
        totalAmount: existingStatus?.totalAmount,
        createdAt: existingStatus?.createdAt,
        items: existingStatus?.items,
        shippingAddress: existingStatus?.shippingAddress,
        receiptUrl: sanitizeReceiptUrl(existingStatus?.receiptUrl),
        couponCode: existingStatus?.couponCode,
        couponUsed,
      });
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

    console.log('Square webhook processed', { eventType, eventId, orderId, paymentStatus });

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WEBHOOK_PROCESSING_FAILED', message: 'Webhook処理に失敗しました' },
    });
  }
});

// GET /api/checkout/payment-status/:orderId
checkoutRouter.get('/payment-status/:orderId', requireAuth, (req, res) => {
  const user = getAuthUser(res);
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
  const paymentIdQuery = typeof req.query.paymentId === 'string' ? req.query.paymentId.trim() : '';
  if (!orderId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ORDER_ID', message: '注文IDが必要です' },
    });
    return;
  }
  if (!paymentIdQuery) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PAYMENT_ID', message: '決済IDが必要です' },
    });
    return;
  }

  const paymentStatus = getOrderPaymentStatus(orderId);
  if (!paymentStatus || paymentStatus.paymentId !== paymentIdQuery || paymentStatus.userId !== user.id) {
    res.status(404).json({
      success: false,
      error: { code: 'PAYMENT_STATUS_NOT_FOUND', message: '決済ステータスが見つかりません' },
    });
    return;
  }

  res.json({
    success: true,
    paymentStatus: sanitizePaymentStatusReceipt(paymentStatus),
  });
});

// GET /api/checkout/orders
checkoutRouter.get('/orders', requireAuth, (req, res) => {
  const user = getAuthUser(res);
  const orders = getOrdersByUserId(user.id);
  res.json({ success: true, orders: orders.map(sanitizePaymentStatusReceipt) });
});

// GET /api/checkout/orders/:orderId
checkoutRouter.get('/orders/:orderId', requireAuth, (req, res) => {
  const user = getAuthUser(res);
  const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
  if (!orderId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ORDER_ID', message: '注文IDが必要です' },
    });
    return;
  }

  const orderStatus = getOrderPaymentStatus(orderId);
  if (!orderStatus || orderStatus.userId !== user.id) {
    res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: '注文が見つかりません' },
    });
    return;
  }

  res.json({ success: true, order: sanitizePaymentStatusReceipt(orderStatus) });
});

// POST /api/checkout/validate-coupon
checkoutRouter.post('/validate-coupon', requireAuth, async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'クーポンコードを入力してください' },
      });
      return;
    }

    const result = await validateCoupon(code);

    if (!result.valid) {
      res.json({
        success: false,
        error: { code: 'INVALID_COUPON', message: result.error || '無効なクーポンです' },
      });
      return;
    }

    res.json({
      success: true,
      coupon: {
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'COUPON_ERROR', message: 'クーポンの検証に失敗しました' },
    });
  }
});
