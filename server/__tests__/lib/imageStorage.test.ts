import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

const mockConfig: Record<string, string | undefined> = {};

vi.mock('../../config.js', () => ({
  config: new Proxy({} as Record<string, string | undefined>, {
    get: (_, prop: string) => mockConfig[prop],
  }),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  uploadImageToStorage,
  uploadOriginalImage,
  downloadOriginalImage,
  deleteImageFromStorage,
} from '../../lib/imageStorage.js';

// Minimal valid base64 images
const VALID_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=';
const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.SUPABASE_URL = 'https://test.supabase.co';
  mockConfig.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  mockFetch.mockReset();
});

// ── Tests ──────────────────────────────────────────────

describe('uploadImageToStorage', () => {
  it('returns error when Supabase config is missing', async () => {
    mockConfig.SUPABASE_URL = undefined;
    const result = await uploadImageToStorage(VALID_JPEG, 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('configuration missing');
  });

  it('returns error for invalid base64 format', async () => {
    const result = await uploadImageToStorage('not-a-data-url', 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Invalid base64');
  });

  it('returns error for corrupted base64 data', async () => {
    const result = await uploadImageToStorage('data:image/jpeg;base64,!!!invalid!!!', 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Invalid base64');
  });

  it('returns error for disallowed MIME type', async () => {
    const result = await uploadImageToStorage('data:image/bmp;base64,AAAA', 'order-1');
    // bmp doesn't match the regex pattern /^data:(image\/[a-z]+);base64,(.+)$/i
    // Actually bmp would match the regex. Let's check the MIME whitelist
    expect(result.success).toBe(false);
  });

  it('returns error when image exceeds 5MB', async () => {
    // Create a large valid base64 that decodes to >5MB
    const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(7_000_000);
    const result = await uploadImageToStorage(largeBase64, 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('5MB');
  });

  it('returns success with correct URL on successful upload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    const result = await uploadImageToStorage(VALID_JPEG, 'order-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.publicUrl).toMatch(/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/public\/portraits\/orders\//);
      expect(result.path).toMatch(/^orders\/order-1\//);
      expect(result.size).toBeGreaterThan(0);
    }
  });

  it('sends correct auth header and content-type', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    await uploadImageToStorage(VALID_JPEG, 'order-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test.supabase.co/storage/v1/object/portraits/orders/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-service-key',
          'Content-Type': 'image/jpeg',
        }),
      }),
    );
  });

  it('returns error when Supabase returns non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('Internal Error') });

    const result = await uploadImageToStorage(VALID_JPEG, 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('500');
  });

  it('sanitizes orderId with path traversal characters', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    const result = await uploadImageToStorage(VALID_JPEG, '../../../etc');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.path).not.toContain('..');
      expect(result.path).toMatch(/^orders\/_+etc\//);
    }
  });

  it('uses correct extension for PNG', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    const result = await uploadImageToStorage(VALID_PNG, 'order-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.path).toMatch(/\.png$/);
    }
  });

  it('returns error on fetch exception (timeout)', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

    const result = await uploadImageToStorage(VALID_JPEG, 'order-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });
});

describe('uploadOriginalImage', () => {
  it('returns null when Supabase config is missing', async () => {
    mockConfig.SUPABASE_URL = undefined;
    const result = await uploadOriginalImage('user-1', 'proj-1', VALID_JPEG);
    expect(result).toBeNull();
  });

  it('returns null for invalid base64 format', async () => {
    const result = await uploadOriginalImage('user-1', 'proj-1', 'invalid');
    expect(result).toBeNull();
  });

  it('returns storage path on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    const result = await uploadOriginalImage('user-1', 'proj-1', VALID_JPEG);
    expect(result).toBe('user-1/proj-1.jpg');
  });

  it('sanitizes userId and projectId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

    const result = await uploadOriginalImage('../hack', '../../etc', VALID_JPEG);
    expect(result).not.toContain('..');
    expect(result).toMatch(/^_+hack\/_+etc\.jpg$/);
  });

  it('returns null when upload fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('Error') });

    const result = await uploadOriginalImage('user-1', 'proj-1', VALID_JPEG);
    expect(result).toBeNull();
  });
});

describe('downloadOriginalImage', () => {
  it('returns null when path contains ..', async () => {
    const result = await downloadOriginalImage('user/../../../etc/passwd');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when path starts with /', async () => {
    const result = await downloadOriginalImage('/etc/passwd');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when Supabase config is missing', async () => {
    mockConfig.SUPABASE_URL = undefined;
    const result = await downloadOriginalImage('user-1/proj-1.jpg');
    expect(result).toBeNull();
  });

  it('returns Buffer on successful download', async () => {
    const testData = new Uint8Array([1, 2, 3, 4]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(testData.buffer),
    });

    const result = await downloadOriginalImage('user-1/proj-1.jpg');
    expect(result).toBeInstanceOf(Buffer);
    expect(result?.length).toBe(4);
  });

  it('returns null on download failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await downloadOriginalImage('user-1/proj-1.jpg');
    expect(result).toBeNull();
  });
});

describe('deleteImageFromStorage', () => {
  it('returns false when path contains ..', async () => {
    const result = await deleteImageFromStorage('orders/../../../etc');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns false when path does not start with orders/', async () => {
    const result = await deleteImageFromStorage('user-1/image.jpg');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns true on successful deletion', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await deleteImageFromStorage('orders/order-1/image.jpg');
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/storage/v1/object/portraits/orders/order-1/image.jpg',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('returns false when Supabase config is missing', async () => {
    mockConfig.SUPABASE_URL = undefined;
    const result = await deleteImageFromStorage('orders/order-1/image.jpg');
    expect(result).toBe(false);
  });

  it('returns false on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await deleteImageFromStorage('orders/order-1/image.jpg');
    expect(result).toBe(false);
  });
});
