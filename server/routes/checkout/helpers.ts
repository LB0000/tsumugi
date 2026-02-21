import { createHash } from 'crypto';
import type { Response } from 'express';
import { SquareError } from 'square';
import { logger } from '../../lib/logger.js';
import { SHIPPING_FIELD_LIMITS } from '../../../shared/validation.js';
import type { OrderPaymentStatus } from '../../lib/checkoutState.js';

// ── Types ──────────────────────────────────────────────

export interface CartItemPayload {
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

export interface GiftOptionsPayload {
  isGift: boolean;
  wrappingId?: 'standard' | 'premium' | 'noshi';
  noshiType?: string;
  messageCard?: string;
  recipientAddress?: Partial<ShippingAddressPayload>;
}

export interface BuildOrderPaymentStatusUpdateInput {
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

// ── Constants ──────────────────────────────────────────

export const MAX_ITEM_QUANTITY = 10;
export const MAX_CART_ITEMS = 20;
export const ORDER_LINK_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

export const GIFT_WRAPPING_PRICES: Record<string, { price: number; label: string }> = {
  premium: { price: 500, label: 'ギフトラッピング（プレミアム）' },
  noshi: { price: 300, label: 'のし紙' },
};

// ── Helper Functions ───────────────────────────────────

export function handleSquareOrServerError(
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

export function sanitizePaymentStatusReceipt<T extends { receiptUrl?: string }>(status: T): T {
  const sanitizedReceiptUrl = sanitizeReceiptUrl(status.receiptUrl);
  if (!sanitizedReceiptUrl) {
    const rest = { ...status } as T;
    delete (rest as { receiptUrl?: string }).receiptUrl;
    return rest;
  }
  return { ...status, receiptUrl: sanitizedReceiptUrl };
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

export { SHIPPING_FIELD_LIMITS };

export function normalizeShippingAddress(address?: Partial<ShippingAddressPayload>): ShippingAddressPayload | null {
  if (!address) return null;

  const normalized = {
    lastName: (address.lastName?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.lastName),
    firstName: (address.firstName?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.firstName),
    email: (address.email?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.email),
    phone: (address.phone?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.phone),
    postalCode: (address.postalCode?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.postalCode),
    prefecture: (address.prefecture?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.prefecture),
    city: (address.city?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.city),
    addressLine: (address.addressLine?.trim() ?? '').slice(0, SHIPPING_FIELD_LIMITS.addressLine),
  };

  const requiredValues = Object.values(normalized);
  if (requiredValues.some((value) => value.length === 0)) {
    return null;
  }

  return normalized;
}

/** Strip HTML tags and entities from user input (simple sanitization) */
export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}
