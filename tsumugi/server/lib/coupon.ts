export interface CouponValidation {
  valid: boolean;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  error?: string;
}

export async function validateCoupon(code: string): Promise<CouponValidation> {
  const adminApiUrl = process.env.TSUMUGI_ADMIN_API_URL || 'http://localhost:3002';
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!internalKey) {
    return { valid: false, error: 'クーポン機能が設定されていません' };
  }

  try {
    const response = await fetch(`${adminApiUrl}/api/campaigns/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { valid: false, error: (body as { error?: string }).error || 'クーポンの検証に失敗しました' };
    }

    return await response.json() as CouponValidation;
  } catch {
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
  const adminApiUrl = process.env.TSUMUGI_ADMIN_API_URL || 'http://localhost:3002';
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!internalKey) return false;

  try {
    const response = await fetch(`${adminApiUrl}/api/campaigns/coupons/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    return response.ok;
  } catch {
    console.error('Failed to mark coupon as used:', code);
    return false;
  }
}
