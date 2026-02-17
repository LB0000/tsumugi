import { createHash } from 'crypto';
import { Router } from 'express';
import type { Request } from 'express';
import { SquareError, WebhooksHelper } from 'square';
import { SHIPPING_FLAT_FEE, SHIPPING_FREE_THRESHOLD, DISCOUNT_RATE, DISCOUNT_WINDOW_MS, catalogById } from '../lib/catalog.js';
import { isValidEmail, validatePortraitName } from '../lib/validation.js';
import { validate } from '../lib/schemas.js';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { sendOrderConfirmationEmail } from '../lib/email.js';
import { scheduleReviewRequestEmail } from '../lib/scheduledEmails.js';
import { sendPurchaseEvent } from '../lib/metaConversions.js';
import { config } from '../config.js';

const processPaymentInputSchema = z.object({
  sourceId: z.string().min(1),
  orderId: z.string().min(1),
});
import {
  claimCouponUsage,
  getOrderPaymentStatus,
  getOrdersByUserId,
  hasProcessedWebhookEvent,
  markProcessedWebhookEvent,
  type OrderPaymentStatus,
  unclaimCouponUsage,
  updateOrderPaymentStatus,
} from '../lib/checkoutState.js';
import { getUserBySessionToken } from '../lib/auth.js';
import { locationId, squareClient } from '../lib/square.js';
import { validateCoupon, applyDiscount, useCoupon } from '../lib/coupon.js';
import { extractSessionTokenFromHeaders, parseCookies, type HeaderMap } from '../lib/requestAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { uploadImageToStorage } from '../lib/imageStorage.js';
import { generatePDFForOrder } from '../lib/lylyIntegration.js';

export const checkoutRouter = Router();
checkoutRouter.use(csrfProtection({ skipPaths: ['/webhook'] }));

function handleSquareOrServerError(
  res: Parameters<Parameters<typeof checkoutRouter.post>[1]>[1],
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

interface CartItemPayload {
  productId: string;
  quantity: number;
  price?: number;  // 24時間割引対応（クライアント側の価格）
  imageData?: string;  // Base64 image data for upload to Supabase Storage
  options?: Record<string, unknown>;  // Product options (e.g., portraitName)
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
const MAX_CART_ITEMS = 20;
const ORDER_LINK_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

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
    const rest = { ...status } as T;
    delete (rest as { receiptUrl?: string }).receiptUrl;
    return rest;
  }
  return { ...status, receiptUrl: sanitizedReceiptUrl };
}

interface BuildOrderPaymentStatusUpdateInput {
  orderId: string;
  paymentId: string;
  paymentStatus: string;
  updatedAt: string;
  existingStatus: OrderPaymentStatus | null;
  couponUsed: boolean;
  receiptUrl?: unknown;
  fallbackTotalAmount?: number;
  fallbackCreatedAt?: string;
}

export function buildOrderPaymentStatusUpdate(input: BuildOrderPaymentStatusUpdateInput): OrderPaymentStatus {
  const {
    orderId,
    paymentId,
    paymentStatus,
    updatedAt,
    existingStatus,
    couponUsed,
    receiptUrl,
    fallbackTotalAmount,
    fallbackCreatedAt,
  } = input;

  const sanitizedIncomingReceiptUrl = sanitizeReceiptUrl(receiptUrl);
  const sanitizedExistingReceiptUrl = sanitizeReceiptUrl(existingStatus?.receiptUrl);
  const normalizedReceiptUrl = sanitizedIncomingReceiptUrl ?? sanitizedExistingReceiptUrl;
  const normalizedCreatedAt = existingStatus?.createdAt ?? fallbackCreatedAt ?? updatedAt;
  const normalizedTotalAmount = existingStatus?.totalAmount ?? fallbackTotalAmount;

  return {
    orderId,
    paymentId,
    status: paymentStatus,
    updatedAt,
    userId: existingStatus?.userId,
    totalAmount: normalizedTotalAmount,
    createdAt: normalizedCreatedAt,
    items: existingStatus?.items,
    shippingAddress: existingStatus?.shippingAddress,
    receiptUrl: normalizedReceiptUrl,
    couponCode: existingStatus?.couponCode,
    couponUsed,
    giftInfo: existingStatus?.giftInfo,
  };
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

interface GiftOptionsPayload {
  isGift: boolean;
  wrappingId?: 'standard' | 'premium' | 'noshi';
  noshiType?: string;
  messageCard?: string;
  recipientAddress?: Partial<ShippingAddressPayload>;
}

const GIFT_WRAPPING_PRICES: Record<string, { price: number; label: string }> = {
  premium: { price: 500, label: 'ギフトラッピング（プレミアム）' },
  noshi: { price: 300, label: 'のし紙' },
};

// POST /api/checkout/create-order
checkoutRouter.post('/create-order', async (req, res) => {
  try {
    const { items, shippingAddress, clientRequestId, couponCode, giftOptions, generatedAt } = req.body as {
      items: CartItemPayload[];
      shippingAddress?: Partial<ShippingAddressPayload>;
      clientRequestId?: string;
      couponCode?: string;
      giftOptions?: GiftOptionsPayload;
      generatedAt?: number;  // プレビュー生成時刻（Unixタイムスタンプms）
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CART', message: 'カートが空です' },
      });
      return;
    }

    if (items.length > MAX_CART_ITEMS) {
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

      // 価格検証：クライアント価格がカタログ価格の0.9倍〜1.0倍の範囲内か確認
      // 24時間限定割引が有効な場合のみ0.9倍を許可
      let validatedPrice = catalogItem.price;
      if (typeof item.price === 'number') {
        const now = Date.now();
        let isDiscountValid = false;

        // 24時間ウィンドウの検証
        if (typeof generatedAt === 'number' && Number.isFinite(generatedAt)) {
          // 未来の時刻でないか確認（タイムスタンプ改ざん対策）
          if (generatedAt <= now) {
            const elapsedMs = now - generatedAt;
            // 24時間以内か確認
            isDiscountValid = elapsedMs >= 0 && elapsedMs <= DISCOUNT_WINDOW_MS;
          }
        }

        const minPrice = isDiscountValid
          ? Math.floor(catalogItem.price * (1 - DISCOUNT_RATE))
          : catalogItem.price;  // 割引期間外は定価のみ許可
        const maxPrice = catalogItem.price;

        if (item.price < minPrice || item.price > maxPrice) {
          throw new Error('INVALID_PRICE');
        }

        validatedPrice = item.price;
      }

      subtotal += validatedPrice * quantity;
      requiresShipping = requiresShipping || catalogItem.requiresShipping;

      return {
        productId: catalogItem.id,
        name: catalogItem.name,
        quantity,
        price: validatedPrice,
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

    // Add gift wrapping as a line item if applicable
    if (giftOptions?.isGift && giftOptions.wrappingId) {
      const wrapping = GIFT_WRAPPING_PRICES[giftOptions.wrappingId];
      if (wrapping && wrapping.price > 0) {
        lineItems.push({
          name: wrapping.label,
          quantity: '1',
          basePriceMoney: {
            amount: BigInt(wrapping.price),
            currency: 'JPY' as const,
          },
          metadata: {
            productId: `gift-wrapping-${giftOptions.wrappingId}`,
          },
        });
      }
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

    // Determine shipping destination: use recipient address if gift with different recipient
    let recipientAddress: ReturnType<typeof normalizeShippingAddress> = null;
    if (giftOptions?.isGift && giftOptions.recipientAddress) {
      recipientAddress = normalizeShippingAddress(giftOptions.recipientAddress);
      if (!recipientAddress) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT_ADDRESS', message: 'ギフト送り先の住所情報が不足しています' },
        });
        return;
      }
    }
    const shippingDestination = recipientAddress ?? normalizedAddress;

    const response = await squareClient.orders.create({
      order: {
        locationId,
        lineItems,
        ...(discounts && { discounts }),
        ...(shippingDestination && {
          fulfillments: [
            {
              type: 'SHIPMENT',
              state: 'PROPOSED',
              shipmentDetails: {
                recipient: {
                  displayName: `${shippingDestination.lastName} ${shippingDestination.firstName}`,
                  emailAddress: shippingDestination.email,
                  phoneNumber: shippingDestination.phone,
                  address: {
                    postalCode: shippingDestination.postalCode,
                    administrativeDistrictLevel1: shippingDestination.prefecture,
                    locality: shippingDestination.city,
                    addressLine1: shippingDestination.addressLine,
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

    // Upload images to Supabase Storage and add imageUrl + options to normalized items
    const normalizedItemsWithImages = await Promise.all(
      normalizedItems.map(async (item, index) => {
        const sourceItem = items[index];
        let imageUrl: string | undefined = undefined;

        // Upload image if provided
        // [M1] Retry strategy (max 3 attempts, exponential backoff)
        if (sourceItem.imageData && order.id) {
          let uploadResult;
          let lastError: string | undefined;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              uploadResult = await uploadImageToStorage(sourceItem.imageData, order.id);

              if (uploadResult.success) {
                imageUrl = uploadResult.publicUrl;
                logger.info('Image uploaded to Supabase Storage', {
                  orderId: order.id,
                  imageUrl: uploadResult.publicUrl,
                  size: uploadResult.size,
                  attempt,
                });
                break; // Success, exit retry loop
              } else {
                lastError = uploadResult.error;

                if (attempt < 3) {
                  const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s
                  logger.warn('Image upload failed, retrying', {
                    orderId: order.id,
                    attempt,
                    delayMs,
                    error: uploadResult.error,
                  });
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
              }
            } catch (error) {
              lastError = error instanceof Error ? error.message : String(error);

              if (attempt < 3) {
                const delayMs = Math.pow(2, attempt) * 1000;
                logger.warn('Image upload exception, retrying', {
                  orderId: order.id,
                  attempt,
                  delayMs,
                  error: lastError,
                });
                await new Promise((resolve) => setTimeout(resolve, delayMs));
              }
            }
          }

          // Final error logging if all retries failed
          if (!imageUrl) {
            logger.error('Image upload failed after all retries', {
              orderId: order.id,
              error: lastError,
              attempts: 3,
            });
          }
        }

        // [M7] Validate and sanitize options (prevent XSS attacks)
        const validatedOptions = sourceItem.options ? {
          portraitName: typeof sourceItem.options.portraitName === 'string'
            ? validatePortraitName(sourceItem.options.portraitName) || undefined
            : undefined,
        } : undefined;

        return {
          ...item,
          imageUrl,
          options: validatedOptions,
        };
      })
    );

    // [Phase 10] Log business metrics: name engraving usage and product mix
    const itemsWithNames = normalizedItemsWithImages.filter((item) => item.options?.portraitName);
    if (itemsWithNames.length > 0) {
      logger.info('Name engraving feature used in order', {
        orderId: order.id,
        itemsWithNames: itemsWithNames.length,
        totalItems: normalizedItemsWithImages.length,
        usageRate: `${Math.round((itemsWithNames.length / normalizedItemsWithImages.length) * 100)}%`,
      });
    }

    // [Phase 10] Log product mix for analytics
    const productCounts = normalizedItemsWithImages.reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Order product mix', {
      orderId: order.id,
      totalAmount,
      productCounts,
      uniqueProducts: Object.keys(productCounts).length,
    });

    // Link order to user if logged in
    const sessionToken = extractSessionTokenFromHeaders(req.headers as HeaderMap);
    const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
    const totalAmount = Number(order.totalMoney?.amount ?? 0);

    // Build gift info metadata
    const giftInfo = giftOptions?.isGift ? {
      wrappingId: giftOptions.wrappingId,
      noshiType: giftOptions.wrappingId === 'noshi' ? giftOptions.noshiType : undefined,
      messageCard: typeof giftOptions.messageCard === 'string' ? giftOptions.messageCard.slice(0, 200) : undefined,
      recipientAddress: recipientAddress ?? undefined,
    } : undefined;

    if (order.id) {
      updateOrderPaymentStatus({
        orderId: order.id,
        paymentId: '',
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
        userId: sessionUser?.id,
        totalAmount,
        createdAt: new Date().toISOString(),
        items: normalizedItemsWithImages,
        shippingAddress: normalizedAddress ?? undefined,
        couponCode: appliedCoupon?.code,
        giftInfo,
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

    if (error instanceof Error && error.message === 'INVALID_PRICE') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRICE', message: '商品価格が不正です' },
      });
      return;
    }

    handleSquareOrServerError(res, error, 'ORDER_CREATION_FAILED', '注文の作成に失敗しました', req.requestId);
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

    // Mark coupon as used on successful payment (claim first, then call remote API)
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

    // Send order confirmation email and schedule review request on successful payment
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

      // Send Meta Conversions API Purchase event (server-side)
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
      receiptUrl: sanitizedReceiptUrl,
    });
  } catch (error) {
    handleSquareOrServerError(res, error, 'PAYMENT_FAILED', '決済処理に失敗しました', req.requestId);
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

    if (!orderId || !paymentId || !paymentStatus) {
      logger.warn('Webhook missing required fields', { eventType, eventId, hasOrderId: !!orderId, hasPaymentId: !!paymentId, hasPaymentStatus: !!paymentStatus });
    }

    if (orderId && paymentId && paymentStatus) {
      const existingStatus = getOrderPaymentStatus(orderId);
      let couponUsed = existingStatus?.couponUsed ?? false;

      // Fallback: mark coupon as used via webhook if not already done (claim first)
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

      // [Phase 7] Generate LYLY PDF on payment completion (non-blocking)
      if (paymentStatus === 'COMPLETED' && existingStatus) {
        void (async () => {
          try {
            logger.info('Starting LYLY PDF generation', { orderId });

            // [C2] Update status to processing (get latest state to avoid race condition)
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
              logger.info('LYLY PDF generation succeeded', {
                orderId,
                pdfUrl: result.pdfUrl,
              });
            } else {
              updateOrderPaymentStatus({
                ...getOrderPaymentStatus(orderId)!,
                printDataStatus: 'failed',
                printDataError: result.errors?.join('; ') || 'Unknown error',
              });
              logger.error('LYLY PDF generation failed', {
                orderId,
                errors: result.errors,
              });
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
    logger.error('Validate coupon error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'COUPON_ERROR', message: 'クーポンの検証に失敗しました' },
    });
  }
});

// POST /api/checkout/link-order — ゲスト注文を新規アカウントに紐付け
checkoutRouter.post('/link-order', requireAuth, (req, res) => {
  const user = getAuthUser(res);
  const { orderId } = req.body as { orderId?: string };

  if (!orderId || typeof orderId !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ORDER_ID', message: '注文番号が必要です' },
    });
    return;
  }

  const orderStatus = getOrderPaymentStatus(orderId);
  if (!orderStatus) {
    res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: '注文が見つかりません' },
    });
    return;
  }

  // セキュリティ: メールアドレス一致チェック（大文字小文字を区別しない）
  if (orderStatus.shippingAddress?.email?.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({
      success: false,
      error: { code: 'EMAIL_MISMATCH', message: 'この注文を紐付ける権限がありません' },
    });
    return;
  }

  // セキュリティ: 注文作成から72時間以内のみ紐付け可能（古い注文の横取り防止）
  const orderCreatedAt = orderStatus.createdAt ? new Date(orderStatus.createdAt).getTime() : 0;
  if (Date.now() - orderCreatedAt > ORDER_LINK_WINDOW_MS) {
    res.status(403).json({
      success: false,
      error: { code: 'LINK_WINDOW_EXPIRED', message: '注文の紐付け期限が過ぎています。サポートにお問い合わせください。' },
    });
    return;
  }

  // 既に紐付け済みチェック（同一ユーザーなら冪等に成功扱い）
  if (orderStatus.userId) {
    if (orderStatus.userId === user.id) {
      res.json({ success: true });
      return;
    }
    res.status(400).json({
      success: false,
      error: { code: 'ALREADY_LINKED', message: 'この注文は既にアカウントに紐付けられています' },
    });
    return;
  }

  updateOrderPaymentStatus({ ...orderStatus, userId: user.id });
  logger.info('Guest order linked to account', { orderId, userId: user.id, requestId: req.requestId });
  res.json({ success: true });
});
