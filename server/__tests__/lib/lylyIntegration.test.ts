import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateLylyCSV, callLylyAPI, generatePDFForOrder } from '../../lib/lylyIntegration.js';
import type { OrderPaymentStatus } from '../../lib/checkoutTypes.js';

describe('generateLylyCSV', () => {
  describe('valid orders', () => {
    it('generates CSV for single physical product', () => {
      const order: OrderPaymentStatus = {
        orderId: '50001',
        paymentId: 'test-payment-1',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'acrylic-stand',
            name: 'アクリルスタンド',
            quantity: 1,
            price: 3500,
            imageUrl: 'https://storage.example.com/orders/50001/portrait.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeTruthy();
      expect(csv).toContain('Name,Product Title,Order ID,Line Item Quantity,image1');
      expect(csv).toContain('"#50001","TSUMUGI アクリルスタンド",50001,1,"https://storage.example.com/orders/50001/portrait.jpg"');
    });

    it('generates CSV for multiple physical products', () => {
      const order: OrderPaymentStatus = {
        orderId: '50002',
        paymentId: 'test-payment-2',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'canvas',
            name: 'キャンバスアート',
            quantity: 1,
            price: 12000,
            imageUrl: 'https://storage.example.com/orders/50002/canvas.jpg',
          },
          {
            productId: 'postcard',
            name: 'ポストカード',
            quantity: 2,
            price: 800,
            imageUrl: 'https://storage.example.com/orders/50002/postcard.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeTruthy();
      const lines = csv!.split('\n');
      expect(lines.length).toBe(3); // header + 2 products
      expect(lines[0]).toBe('Name,Product Title,Order ID,Line Item Quantity,image1');
      expect(lines[1]).toContain('TSUMUGI キャンバスアート');
      expect(lines[2]).toContain('TSUMUGI ポストカード');
    });

    it('escapes CSV special characters (RFC 4180)', () => {
      const order: OrderPaymentStatus = {
        orderId: '50003',
        paymentId: 'test-payment-3',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'canvas',
            name: 'キャンバスアート',
            quantity: 1,
            price: 12000,
            imageUrl: 'https://storage.example.com/test,comma.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeTruthy();
      // Commas in image URL should be escaped (wrapped in quotes)
      expect(csv).toContain('"https://storage.example.com/test,comma.jpg"');
    });
  });

  describe('filters and validation', () => {
    it('excludes digital download products', () => {
      const order: OrderPaymentStatus = {
        orderId: '50004',
        paymentId: 'test-payment-4',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'download',
            name: 'デジタルダウンロード',
            quantity: 1,
            price: 1000,
            imageUrl: 'https://storage.example.com/download.jpg',
          },
          {
            productId: 'canvas',
            name: 'キャンバスアート',
            quantity: 1,
            price: 12000,
            imageUrl: 'https://storage.example.com/canvas.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeTruthy();
      expect(csv).not.toContain('デジタルダウンロード');
      expect(csv).toContain('TSUMUGI キャンバスアート');
    });

    it('returns null for download-only orders', () => {
      const order: OrderPaymentStatus = {
        orderId: '50005',
        paymentId: 'test-payment-5',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'download',
            name: 'デジタルダウンロード',
            quantity: 1,
            price: 1000,
            imageUrl: 'https://storage.example.com/download.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeNull();
    });

    it('skips products with missing imageUrl', () => {
      const order: OrderPaymentStatus = {
        orderId: '50006',
        paymentId: 'test-payment-6',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'canvas',
            name: 'キャンバスアート',
            quantity: 1,
            price: 12000,
            // imageUrl missing
          },
          {
            productId: 'postcard',
            name: 'ポストカード',
            quantity: 1,
            price: 800,
            imageUrl: 'https://storage.example.com/postcard.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeTruthy();
      expect(csv).not.toContain('TSUMUGI キャンバスアート');
      expect(csv).toContain('TSUMUGI ポストカード');
    });

    it('returns null for unmapped products (M3 fix)', () => {
      const order: OrderPaymentStatus = {
        orderId: '50010',
        paymentId: 'test-payment-10',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'tshirt', // Not mapped to LYLY template
            name: 'Tシャツ',
            quantity: 1,
            price: 3000,
            imageUrl: 'https://storage.example.com/tshirt.jpg',
          },
        ],
      };

      const csv = generateLylyCSV(order);

      // Should return null for unmapped products
      expect(csv).toBeNull();
    });

    it('rejects non-HTTPS image URLs', () => {
      const order: OrderPaymentStatus = {
        orderId: '50007',
        paymentId: 'test-payment-7',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [
          {
            productId: 'canvas',
            name: 'キャンバスアート',
            quantity: 1,
            price: 12000,
            imageUrl: 'http://insecure.example.com/image.jpg', // HTTP not HTTPS
          },
        ],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeNull(); // Should reject HTTP URLs
    });

    it('returns null for empty items', () => {
      const order: OrderPaymentStatus = {
        orderId: '50008',
        paymentId: 'test-payment-8',
        status: 'COMPLETED',
        updatedAt: '2024-01-01T00:00:00Z',
        items: [],
      };

      const csv = generateLylyCSV(order);

      expect(csv).toBeNull();
    });
  });
});

describe('callLylyAPI', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error if LYLY configuration is missing', async () => {
    // Mock missing config
    vi.mock('../../config.js', () => ({
      config: {
        LYLY_API_URL: undefined,
        LYLY_AUTH_TOKEN: undefined,
      },
    }));

    const result = await callLylyAPI('test,csv,content', '50001');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('LYLY API configuration missing (LYLY_API_URL or LYLY_AUTH_TOKEN)');
  });

  // NOTE: Full LYLY API tests with mocked fetch are omitted for brevity
  // These would test:
  // - Successful PDF generation
  // - SSE event parsing
  // - Timeout handling
  // - Retry strategy
  // - Error responses
});

describe('generatePDFForOrder', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error if LYLY configuration is missing', async () => {
    const order: OrderPaymentStatus = {
      orderId: '50001',
      paymentId: 'test-payment-1',
      status: 'COMPLETED',
      updatedAt: '2024-01-01T00:00:00Z',
      items: [
        {
          productId: 'canvas',
          name: 'キャンバスアート',
          quantity: 1,
          price: 12000,
          imageUrl: 'https://storage.example.com/canvas.jpg',
        },
      ],
    };

    const result = await generatePDFForOrder(order);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('LYLY API configuration missing (LYLY_API_URL or LYLY_AUTH_TOKEN)');
  });

  it('returns success=false if no physical products', async () => {
    const order: OrderPaymentStatus = {
      orderId: '50002',
      paymentId: 'test-payment-2',
      status: 'COMPLETED',
      updatedAt: '2024-01-01T00:00:00Z',
      items: [
        {
          productId: 'download',
          name: 'デジタルダウンロード',
          quantity: 1,
          price: 1000,
          imageUrl: 'https://storage.example.com/download.jpg',
        },
      ],
    };

    const result = await generatePDFForOrder(order);

    expect(result.success).toBe(false);
    expect(result.logs).toEqual([]);
    // Note: errors array may vary depending on implementation
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  // NOTE: unmapped products error handling (M3) is tested at generateLylyCSV level
  // See: "returns null for unmapped products (M3 fix)" test above

  // NOTE: Full integration tests with mocked LYLY API are omitted
  // These would test the retry strategy and error handling
});
