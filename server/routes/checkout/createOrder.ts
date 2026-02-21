import type { Router } from 'express';
import { SHIPPING_FLAT_FEE, SHIPPING_FREE_THRESHOLD, DISCOUNT_RATE, DISCOUNT_WINDOW_MS, catalogById } from '../../lib/catalog.js';
import { isValidEmail, validatePortraitName, validateTextOverlaySettings } from '../../lib/validation.js';
import { logger } from '../../lib/logger.js';
import { updateOrderPaymentStatus } from '../../lib/checkoutState.js';
import { getUserBySessionToken } from '../../lib/auth.js';
import { locationId, squareClient } from '../../lib/square.js';
import { validateCoupon, applyDiscount } from '../../lib/coupon.js';
import { extractSessionTokenFromHeaders, type HeaderMap } from '../../lib/requestAuth.js';
import { uploadImageToStorage } from '../../lib/imageStorage.js';
import {
  type CartItemPayload,
  type ShippingAddressPayload,
  type GiftOptionsPayload,
  MAX_ITEM_QUANTITY,
  MAX_CART_ITEMS,
  GIFT_WRAPPING_PRICES,
  handleSquareOrServerError,
  makeIdempotencyKey,
  normalizeShippingAddress,
  stripHtmlTags,
} from './helpers.js';

const MAX_IMAGES_PER_ORDER = 3;
const MAX_BASE64_STRING_LENGTH = 7_000_000; // ~5MB decoded

export function registerCreateOrder(router: Router) {
  router.post('/create-order', async (req, res) => {
    try {
      const { items, shippingAddress, clientRequestId, couponCode, giftOptions, generatedAt } = req.body as {
        items: CartItemPayload[];
        shippingAddress?: Partial<ShippingAddressPayload>;
        clientRequestId?: string;
        couponCode?: string;
        giftOptions?: GiftOptionsPayload;
        generatedAt?: number;
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

        let validatedPrice = catalogItem.price;
        if (typeof item.price === 'number') {
          const now = Date.now();
          let isDiscountValid = false;

          if (typeof generatedAt === 'number' && Number.isFinite(generatedAt)) {
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            if (generatedAt <= now && generatedAt > now - SEVEN_DAYS_MS) {
              const elapsedMs = now - generatedAt;
              isDiscountValid = elapsedMs >= 0 && elapsedMs <= DISCOUNT_WINDOW_MS;
            }
          }

          const minPrice = isDiscountValid
            ? Math.floor(catalogItem.price * (1 - DISCOUNT_RATE))
            : catalogItem.price;
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

      const discounts = appliedCoupon ? [{
        name: `クーポン: ${appliedCoupon.code}`,
        type: 'FIXED_AMOUNT' as const,
        amountMoney: {
          amount: BigInt(subtotal - discountedSubtotal),
          currency: 'JPY' as const,
        },
        scope: 'ORDER' as const,
      }] : undefined;

      // Determine shipping destination
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

      // Validate image count and size before creating the order
      const itemsWithImages = items.filter(item => item.imageData);
      if (itemsWithImages.length > MAX_IMAGES_PER_ORDER) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_IMAGES', message: `画像は${MAX_IMAGES_PER_ORDER}枚までです` },
        });
        return;
      }
      for (const item of items) {
        if (item.imageData && item.imageData.length > MAX_BASE64_STRING_LENGTH) {
          res.status(400).json({
            success: false,
            error: { code: 'IMAGE_TOO_LARGE', message: '画像サイズが大きすぎます（5MB以下にしてください）' },
          });
          return;
        }
      }

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

      // Upload images to Supabase Storage
      const normalizedItemsWithImages = await Promise.all(
        normalizedItems.map(async (item, index) => {
          const sourceItem = items[index];
          let imageUrl: string | undefined = undefined;

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
                  break;
                } else {
                  lastError = uploadResult.error;
                  if (attempt < 3) {
                    const delayMs = Math.pow(2, attempt) * 1000;
                    logger.warn('Image upload failed, retrying', { orderId: order.id, attempt, delayMs, error: uploadResult.error });
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                  }
                }
              } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                if (attempt < 3) {
                  const delayMs = Math.pow(2, attempt) * 1000;
                  logger.warn('Image upload exception, retrying', { orderId: order.id, attempt, delayMs, error: lastError });
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
              }
            }

            if (!imageUrl) {
              logger.error('Image upload failed after all retries', { orderId: order.id, error: lastError, attempts: 3 });
            }
          }

          const validatedOptions = sourceItem.options ? {
            portraitName: typeof sourceItem.options.portraitName === 'string'
              ? validatePortraitName(sourceItem.options.portraitName) || undefined
              : undefined,
            textOverlaySettings: sourceItem.options.textOverlaySettings
              ? validateTextOverlaySettings(sourceItem.options.textOverlaySettings) || undefined
              : undefined,
          } : undefined;

          return { ...item, imageUrl, options: validatedOptions };
        })
      );

      // Log business metrics
      const itemsWithNames = normalizedItemsWithImages.filter((item) => item.options?.portraitName);
      if (itemsWithNames.length > 0) {
        logger.info('Name engraving feature used in order', {
          orderId: order.id,
          itemsWithNames: itemsWithNames.length,
          totalItems: normalizedItemsWithImages.length,
          usageRate: `${Math.round((itemsWithNames.length / normalizedItemsWithImages.length) * 100)}%`,
        });
      }

      const totalAmount = Number(order.totalMoney?.amount ?? 0);
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

      const giftInfo = giftOptions?.isGift ? {
        wrappingId: giftOptions.wrappingId,
        noshiType: giftOptions.wrappingId === 'noshi' ? giftOptions.noshiType : undefined,
        messageCard: typeof giftOptions.messageCard === 'string' ? stripHtmlTags(giftOptions.messageCard).slice(0, 200) || undefined : undefined,
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

      res.json({ success: true, orderId: order.id, totalAmount });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_PRODUCT_ID') {
        res.status(400).json({ success: false, error: { code: 'INVALID_PRODUCT_ID', message: '商品情報が不正です' } });
        return;
      }
      if (error instanceof Error && error.message === 'INVALID_QUANTITY') {
        res.status(400).json({ success: false, error: { code: 'INVALID_QUANTITY', message: '数量が不正です' } });
        return;
      }
      if (error instanceof Error && error.message === 'UNKNOWN_PRODUCT') {
        res.status(400).json({ success: false, error: { code: 'UNKNOWN_PRODUCT', message: '存在しない商品が含まれています' } });
        return;
      }
      if (error instanceof Error && error.message === 'INVALID_PRICE') {
        res.status(400).json({ success: false, error: { code: 'INVALID_PRICE', message: '商品価格が不正です' } });
        return;
      }
      handleSquareOrServerError(res, error, 'ORDER_CREATION_FAILED', '注文の作成に失敗しました', req.requestId);
    }
  });
}
