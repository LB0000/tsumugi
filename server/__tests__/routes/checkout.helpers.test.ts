import { sanitizeReceiptUrl, normalizeShippingAddress, makeIdempotencyKey } from '../../routes/checkout.js';

// We only import the pure helpers — the Router side-effects (Square SDK etc.)
// are fine to let load since we don't call any route handlers here.

describe('sanitizeReceiptUrl', () => {
  it('passes through a valid https URL', () => {
    expect(sanitizeReceiptUrl('https://squareup.com/receipt/123')).toBe(
      'https://squareup.com/receipt/123',
    );
  });

  it('returns undefined for an http URL', () => {
    expect(sanitizeReceiptUrl('http://squareup.com/receipt/123')).toBeUndefined();
  });

  it('returns undefined for a non-string value', () => {
    expect(sanitizeReceiptUrl(42)).toBeUndefined();
    expect(sanitizeReceiptUrl(null)).toBeUndefined();
    expect(sanitizeReceiptUrl(undefined)).toBeUndefined();
  });

  it('returns undefined for an invalid URL string', () => {
    expect(sanitizeReceiptUrl('not-a-url')).toBeUndefined();
  });
});

describe('normalizeShippingAddress', () => {
  const validAddress = {
    lastName: '田中',
    firstName: '太郎',
    email: 'taro@example.com',
    phone: '090-1234-5678',
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    addressLine: '1-1-1',
  };

  it('normalizes a valid address (trims whitespace)', () => {
    const padded = {
      lastName: ' 田中 ',
      firstName: ' 太郎 ',
      email: ' taro@example.com ',
      phone: ' 090-1234-5678 ',
      postalCode: ' 100-0001 ',
      prefecture: ' 東京都 ',
      city: ' 千代田区 ',
      addressLine: ' 1-1-1 ',
    };
    expect(normalizeShippingAddress(padded)).toEqual(validAddress);
  });

  it('returns null when a required field is missing', () => {
    const { city, ...partial } = validAddress;
    expect(city).toBe('千代田区');
    expect(normalizeShippingAddress(partial as typeof validAddress)).toBeNull();
  });

  it('returns null when a required field is empty after trim', () => {
    expect(normalizeShippingAddress({ ...validAddress, lastName: '  ' })).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeShippingAddress(undefined)).toBeNull();
  });
});

describe('makeIdempotencyKey', () => {
  it('produces a deterministic result for the same inputs', () => {
    const a = makeIdempotencyKey('order', 'seed-123');
    const b = makeIdempotencyKey('order', 'seed-123');
    expect(a).toBe(b);
  });

  it('produces different results for different seeds', () => {
    const a = makeIdempotencyKey('order', 'seed-A');
    const b = makeIdempotencyKey('order', 'seed-B');
    expect(a).not.toBe(b);
  });

  it('includes the prefix in the result', () => {
    const key = makeIdempotencyKey('payment', 'seed');
    expect(key.startsWith('payment-')).toBe(true);
  });
});
