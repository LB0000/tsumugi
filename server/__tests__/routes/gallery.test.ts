import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuthUser: vi.fn(),
}));

vi.mock('../../middleware/csrfProtection.js', () => ({
  csrfProtection: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../lib/galleryState.js', () => ({
  getGalleryItems: vi.fn(),
  getGalleryItem: vi.fn(),
  getGalleryImagePath: vi.fn(),
  deleteGalleryItem: vi.fn(),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { mockFsStat, mockFsReadFile } = vi.hoisted(() => ({
  mockFsStat: vi.fn(),
  mockFsReadFile: vi.fn(),
}));
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  const mockPromises = { ...actual.promises, stat: mockFsStat, readFile: mockFsReadFile };
  return {
    ...actual,
    default: { ...actual, promises: mockPromises },
    promises: mockPromises,
  };
});

import { galleryRouter } from '../../routes/gallery.js';
import { getGalleryItems, getGalleryItem, getGalleryImagePath, deleteGalleryItem } from '../../lib/galleryState.js';
import { getAuthUser } from '../../middleware/requireAuth.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): Partial<Request> {
  return {
    body: overrides.body ?? {},
    headers: { cookie: '' } as Record<string, string>,
    params: overrides.params as Record<string, string> ?? {},
    ip: '127.0.0.1',
    requestId: 'test-req-id',
    method: overrides.method ?? 'GET',
    ...overrides,
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const setHeaderFn = vi.fn();
  const sendFn = vi.fn();

  return {
    res: { json: jsonFn, status: statusFn, setHeader: setHeaderFn, send: sendFn, locals: {} } as unknown as Response,
    statusFn,
    jsonFn,
    setHeaderFn,
    sendFn,
  };
}

// ── Extract handlers ────────────────────────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void> | void;

function findHandler(method: string, path: string): RouteHandler {
  const stack = (galleryRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: RouteHandler }> }; handle?: RouteHandler; name?: string }> }).stack;
  const routeLayer = stack.find(
    (layer) => layer.route?.path === path && layer.route?.methods?.[method],
  );

  if (!routeLayer?.route) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route on galleryRouter`);
  }

  const handlers = routeLayer.route.stack;
  return handlers[handlers.length - 1].handle;
}

let listHandler: RouteHandler;
let imageHandler: RouteHandler;
let thumbnailHandler: RouteHandler;
let deleteHandler: RouteHandler;

const authUser = {
  id: 'usr_1',
  name: 'Test User',
  email: 'test@example.com',
  authProvider: 'email' as const,
  emailVerified: true,
};

beforeAll(() => {
  listHandler = findHandler('get', '/');
  imageHandler = findHandler('get', '/:id/image');
  thumbnailHandler = findHandler('get', '/:id/thumbnail');
  deleteHandler = findHandler('delete', '/:id');
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFsStat.mockReset();
  mockFsReadFile.mockReset();
  vi.mocked(getAuthUser).mockReturnValue(authUser);
});

// ── Tests ──────────────────────────────────────────────

describe('gallery routes', () => {
  // ── GET / ─────────────────────────────────────────────
  describe('GET /', () => {
    it('returns gallery items for authenticated user', () => {
      const items = [
        { id: 'gal_abc123def456', userId: 'usr_1', artStyleId: 'baroque', imageFileName: 'img.png', thumbnailFileName: 'thumb.png', createdAt: '2026-01-01' },
      ];
      vi.mocked(getGalleryItems).mockReturnValue(items);

      const { res, jsonFn } = mockRes();
      listHandler(mockReq(), res);

      expect(getGalleryItems).toHaveBeenCalledWith('usr_1');
      expect(jsonFn).toHaveBeenCalledWith({ success: true, items });
    });

    it('returns empty array when no items', () => {
      vi.mocked(getGalleryItems).mockReturnValue([]);

      const { res, jsonFn } = mockRes();
      listHandler(mockReq(), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, items: [] });
    });
  });

  // ── GET /:id/image ────────────────────────────────────
  describe('GET /:id/image', () => {
    it('returns 400 for invalid gallery ID format', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'invalid-id' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ID' }),
      }));
    });

    it('returns 404 when gallery item not found', async () => {
      vi.mocked(getGalleryItem).mockReturnValue(null);

      const { res, statusFn, jsonFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }));
    });

    it('returns 404 when item belongs to different user', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_other',
        artStyleId: 'baroque',
        imageFileName: 'img.png',
        thumbnailFileName: 'thumb.png',
        createdAt: '2026-01-01',
      });

      const { res, statusFn, jsonFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }));
    });

    it('returns 413 when file is too large', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_1',
        artStyleId: 'baroque',
        imageFileName: 'img.png',
        thumbnailFileName: 'thumb.png',
        createdAt: '2026-01-01',
      });
      vi.mocked(getGalleryImagePath).mockReturnValue('/path/to/img.png');
      mockFsStat.mockResolvedValue({ size: 25 * 1024 * 1024 } as import('fs').Stats);

      const { res, statusFn, jsonFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(413);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FILE_TOO_LARGE' }),
      }));
    });

    it('serves image file with correct content type', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_1',
        artStyleId: 'baroque',
        imageFileName: 'img.png',
        thumbnailFileName: 'thumb.png',
        createdAt: '2026-01-01',
      });
      vi.mocked(getGalleryImagePath).mockReturnValue('/path/to/img.png');
      mockFsStat.mockResolvedValue({ size: 1024 } as import('fs').Stats);
      const imageBuffer = Buffer.from('fake-image');
      mockFsReadFile.mockResolvedValue(imageBuffer);

      const { res, setHeaderFn, sendFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(setHeaderFn).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(setHeaderFn).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
      expect(sendFn).toHaveBeenCalledWith(imageBuffer);
    });

    it('returns 404 when file read fails', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_1',
        artStyleId: 'baroque',
        imageFileName: 'img.jpg',
        thumbnailFileName: 'thumb.jpg',
        createdAt: '2026-01-01',
      });
      vi.mocked(getGalleryImagePath).mockReturnValue('/path/to/img.jpg');
      mockFsStat.mockRejectedValue(new Error('ENOENT'));

      const { res, statusFn, jsonFn } = mockRes();
      await imageHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
      }));
    });
  });

  // ── GET /:id/thumbnail ────────────────────────────────
  describe('GET /:id/thumbnail', () => {
    it('returns 400 for invalid gallery ID format', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await thumbnailHandler(mockReq({ params: { id: 'bad-id' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ID' }),
      }));
    });

    it('serves thumbnail with correct mime type for webp', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_1',
        artStyleId: 'baroque',
        imageFileName: 'img.png',
        thumbnailFileName: 'thumb.webp',
        createdAt: '2026-01-01',
      });
      vi.mocked(getGalleryImagePath).mockReturnValue('/path/to/thumb.webp');
      mockFsStat.mockResolvedValue({ size: 512 } as import('fs').Stats);
      const thumbBuffer = Buffer.from('fake-thumb');
      mockFsReadFile.mockResolvedValue(thumbBuffer);

      const { res, setHeaderFn, sendFn } = mockRes();
      await thumbnailHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(setHeaderFn).toHaveBeenCalledWith('Content-Type', 'image/webp');
      expect(sendFn).toHaveBeenCalledWith(thumbBuffer);
    });

    it('returns 404 when thumbnail file is not found', async () => {
      vi.mocked(getGalleryItem).mockReturnValue({
        id: 'gal_abcdef1234567890',
        userId: 'usr_1',
        artStyleId: 'baroque',
        imageFileName: 'img.png',
        thumbnailFileName: 'thumb.png',
        createdAt: '2026-01-01',
      });
      vi.mocked(getGalleryImagePath).mockReturnValue('/path/to/thumb.png');
      mockFsStat.mockRejectedValue(new Error('ENOENT'));

      const { res, statusFn, jsonFn } = mockRes();
      await thumbnailHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
      }));
    });
  });

  // ── DELETE /:id ───────────────────────────────────────
  describe('DELETE /:id', () => {
    it('returns 400 for invalid gallery ID format', async () => {
      const { res, statusFn, jsonFn } = mockRes();
      await deleteHandler(mockReq({ params: { id: 'bad' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ID' }),
      }));
    });

    it('returns 404 when item not found', async () => {
      vi.mocked(deleteGalleryItem).mockResolvedValue(false);

      const { res, statusFn, jsonFn } = mockRes();
      await deleteHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }));
    });

    it('returns success when item is deleted', async () => {
      vi.mocked(deleteGalleryItem).mockResolvedValue(true);

      const { res, jsonFn } = mockRes();
      await deleteHandler(mockReq({ params: { id: 'gal_abcdef1234567890' } }), res);

      expect(deleteGalleryItem).toHaveBeenCalledWith('usr_1', 'gal_abcdef1234567890');
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });
  });
});
