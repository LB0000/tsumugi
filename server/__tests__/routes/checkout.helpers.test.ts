import {
  sanitizeReceiptUrl,
  normalizeShippingAddress,
  makeIdempotencyKey,
  buildOrderPaymentStatusUpdate,
} from '../../routes/checkout.js';

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

describe('buildOrderPaymentStatusUpdate', () => {
  it('preserves existing metadata and reuses existing receipt URL when incoming URL is invalid', () => {
    const updated = buildOrderPaymentStatusUpdate({
      orderId: 'order-1',
      paymentId: 'pay-1',
      paymentStatus: 'COMPLETED',
      updatedAt: '2026-02-01T00:00:00Z',
      existingStatus: {
        orderId: 'order-1',
        paymentId: '',
        status: 'PENDING',
        updatedAt: '2026-01-31T00:00:00Z',
        userId: 'user-1',
        totalAmount: 9800,
        createdAt: '2026-01-31T00:00:00Z',
        items: [{ productId: 'digital-data', name: '高解像度画像データ', quantity: 1, price: 9800 }],
        shippingAddress: {
          lastName: '田中',
          firstName: '太郎',
          email: 'taro@example.com',
          phone: '090-1234-5678',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine: '1-1-1',
        },
        receiptUrl: 'https://squareup.com/receipt/original',
        couponCode: 'WELCOME10',
        couponUsed: false,
        giftInfo: { wrappingId: 'premium' },
      },
      couponUsed: true,
      receiptUrl: 'javascript:alert(1)',
    });

    expect(updated.orderId).toBe('order-1');
    expect(updated.paymentId).toBe('pay-1');
    expect(updated.status).toBe('COMPLETED');
    expect(updated.userId).toBe('user-1');
    expect(updated.totalAmount).toBe(9800);
    expect(updated.createdAt).toBe('2026-01-31T00:00:00Z');
    expect(updated.items).toHaveLength(1);
    expect(updated.shippingAddress?.email).toBe('taro@example.com');
    expect(updated.receiptUrl).toBe('https://squareup.com/receipt/original');
    expect(updated.couponCode).toBe('WELCOME10');
    expect(updated.couponUsed).toBe(true);
    expect(updated.giftInfo?.wrappingId).toBe('premium');
  });

  it('prefers a valid incoming https receipt URL over existing value', () => {
    const updated = buildOrderPaymentStatusUpdate({
      orderId: 'order-2',
      paymentId: 'pay-2',
      paymentStatus: 'COMPLETED',
      updatedAt: '2026-02-01T00:00:00Z',
      existingStatus: {
        orderId: 'order-2',
        paymentId: '',
        status: 'PENDING',
        updatedAt: '2026-01-31T00:00:00Z',
        receiptUrl: 'https://squareup.com/receipt/old',
      },
      couponUsed: false,
      receiptUrl: 'https://squareup.com/receipt/new',
    });

    expect(updated.receiptUrl).toBe('https://squareup.com/receipt/new');
  });

  it('uses fallback createdAt and totalAmount when existing status is absent', () => {
    const updated = buildOrderPaymentStatusUpdate({
      orderId: 'order-3',
      paymentId: 'pay-3',
      paymentStatus: 'COMPLETED',
      updatedAt: '2026-02-01T01:23:45Z',
      existingStatus: null,
      couponUsed: false,
      fallbackCreatedAt: '2026-02-01T01:23:00Z',
      fallbackTotalAmount: 12345,
    });

    expect(updated.createdAt).toBe('2026-02-01T01:23:00Z');
    expect(updated.totalAmount).toBe(12345);
  });

  it('removes receiptUrl when neither incoming nor existing value is valid', () => {
    const updated = buildOrderPaymentStatusUpdate({
      orderId: 'order-4',
      paymentId: 'pay-4',
      paymentStatus: 'COMPLETED',
      updatedAt: '2026-02-01T00:00:00Z',
      existingStatus: {
        orderId: 'order-4',
        paymentId: '',
        status: 'PENDING',
        updatedAt: '2026-01-31T00:00:00Z',
        receiptUrl: 'not-a-url',
      },
      couponUsed: false,
      receiptUrl: 'http://squareup.com/receipt/invalid-http',
    });

    expect(updated.receiptUrl).toBeUndefined();
  });
});
