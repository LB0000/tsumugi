import { logger } from './logger.js';

export interface CouponValidation {
  valid: boolean;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  error?: string;
}

export async function validateCoupon(code: string): Promise<CouponValidation> {
  const adminApiUrl = process.env.TSUMUGI_ADMIN_API_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!adminApiUrl) {
    logger.warn('Coupon validation skipped: TSUMUGI_ADMIN_API_URL not configured');
    return { valid: false, error: 'クーポン機能が設定されていません' };
  }

  if (!internalKey) {
    logger.warn('Coupon validation skipped: INTERNAL_API_KEY not configured');
    return { valid: false, error: 'クーポン機能が設定されていません' };
  }

  const trimmedCode = code.trim().toUpperCase();
  if (trimmedCode.length === 0 || trimmedCode.length > 50 || !/^[A-Z0-9_-]+$/.test(trimmedCode)) {
    logger.info('Invalid coupon code format', { code: trimmedCode.slice(0, 10) });
    return { valid: false, error: '無効なクーポンコードです' };
  }

  try {
    const response = await fetch(`${adminApiUrl}/api/campaigns/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ code: trimmedCode }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.error('Coupon validation API error', { status: response.status, code: trimmedCode });
      return { valid: false, error: (body as { error?: string }).error || 'クーポンの検証に失敗しました' };
    }

    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null || typeof (data as Record<string, unknown>).valid !== 'boolean') {
      logger.error('Coupon validation invalid response format', { code: trimmedCode });
      return { valid: false, error: 'クーポンサービスから不正なレスポンスが返されました' };
    }
    return data as CouponValidation;
  } catch (error) {
    logger.error('Coupon validation network error', { code: trimmedCode, error: error instanceof Error ? error.message : String(error) });
    return { valid: false, error: 'クーポンサービスに接続できません' };
  }
}

export function applyDiscount(subtotal: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (discountType === 'percentage') {
    const clamped = Math.min(Math.max(discountValue, 0), 100);
    return Math.max(0, Math.round(subtotal * (1 - clamped / 100)));
  }
  return Math.max(0, subtotal - discountValue);
}

export async function useCoupon(code: string): Promise<boolean> {
  const adminApiUrl = process.env.TSUMUGI_ADMIN_API_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!adminApiUrl || !internalKey) {
    logger.warn('Coupon use skipped: admin API not configured');
    return false;
  }

  try {
    const response = await fetch(`${adminApiUrl}/api/campaigns/coupons/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      logger.error('Coupon use API error', { status: response.status, code: code.trim().toUpperCase() });
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (typeof payload === 'object' && payload !== null) {
      const success = (payload as { success?: unknown }).success;
      if (typeof success === 'boolean') return success;
    }

    return false;
  } catch {
    logger.error('Failed to mark coupon as used', { code });
    return false;
  }
}
