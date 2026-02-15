const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

import { validateCoupon, useCoupon } from '../../lib/coupon.js';

describe('validateCoupon', () => {
  it('returns a valid coupon on successful response', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    const body = { valid: true, code: 'SAVE10', discountType: 'percentage', discountValue: 10 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await validateCoupon('save10');
    expect(result).toEqual(body);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns invalid when API responds with an error', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Expired' }), { status: 400 }),
    );

    const result = await validateCoupon('EXPIRED');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Expired');
  });

  it('returns invalid when API error body is not JSON', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', { status: 500 }),
    );

    const result = await validateCoupon('ANY');
    expect(result.valid).toBe(false);
  });

  it('returns invalid on network error', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const result = await validateCoupon('ANY');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('クーポンサービスに接続できません');
  });

  it('returns invalid when response body has non-boolean valid field', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    const body = { valid: 'yes', code: 'X' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await validateCoupon('X');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('クーポンサービスから不正なレスポンスが返されました');
  });

  it('returns invalid when INTERNAL_API_KEY is not set', async () => {
    delete process.env.INTERNAL_API_KEY;

    const result = await validateCoupon('ANY');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('クーポン機能が設定されていません');
  });
});

describe('useCoupon', () => {
  it('returns true on successful response', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 }),
    );

    expect(await useCoupon('SAVE10')).toBe(true);
  });

  it('returns false when API responds with error', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 500 }),
    );

    expect(await useCoupon('SAVE10')).toBe(false);
  });

  it('returns false on network error', async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    expect(await useCoupon('SAVE10')).toBe(false);
  });

  it('returns false when INTERNAL_API_KEY is not set', async () => {
    delete process.env.INTERNAL_API_KEY;

    expect(await useCoupon('SAVE10')).toBe(false);
  });
});
