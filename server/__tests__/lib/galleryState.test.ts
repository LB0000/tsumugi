/**
 * Unit tests for gallery state library
 * Tests addGalleryItem, getGalleryItems, getGalleryItem, getGalleryImagePath, deleteGalleryItem
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: vi.fn(() => JSON.stringify({ version: 1, items: [] })),
      promises: {
        ...actual.promises,
        mkdir: vi.fn(async () => undefined),
        writeFile: vi.fn(async () => undefined),
        unlink: vi.fn(async () => undefined),
      },
    },
    readFileSync: vi.fn(() => JSON.stringify({ version: 1, items: [] })),
    promises: {
      ...actual.promises,
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
      unlink: vi.fn(async () => undefined),
    },
  };
});

vi.mock('../../lib/persistence.js', () => ({
  readJsonFile: vi.fn(() => ({ version: 1, items: [] })),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient.js', () => ({
  hasSupabaseConfig: vi.fn(() => false),
}));

vi.mock('../../lib/galleryStateStore.js', () => ({
  loadGallerySnapshot: vi.fn(async () => ({ version: 1, items: [] })),
  persistGallerySnapshot: vi.fn(async () => {}),
}));

// ── Imports ───────────────────────────────────────────

// ── Tests ─────────────────────────────────────────────

describe('Gallery State Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Dynamic import to get fresh module state for each test group
  async function importModule() {
    vi.resetModules();
    return import('../../lib/galleryState.js');
  }

  // Helper to create a valid PNG data URL
  function createPngDataUrl(content: string = 'test'): string {
    const base64 = Buffer.from(content).toString('base64');
    return `data:image/png;base64,${base64}`;
  }

  // Helper to create a valid JPEG data URL
  function createJpegDataUrl(content: string = 'test'): string {
    const base64 = Buffer.from(content).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  }

  describe('getGalleryImagePath', () => {
    it('should return a valid file path for a normal filename', async () => {
      const mod = await importModule();
      const result = mod.getGalleryImagePath('gal_abc123.png');

      expect(result).toContain('gallery');
      expect(result).toContain('gal_abc123.png');
    });

    it('should throw for path traversal attempts', async () => {
      const mod = await importModule();

      expect(() => mod.getGalleryImagePath('../../../etc/passwd')).toThrow('Invalid gallery file path');
    });

    it('should throw for absolute path injection', async () => {
      const mod = await importModule();

      expect(() => mod.getGalleryImagePath('/etc/passwd')).toThrow('Invalid gallery file path');
    });
  });

  describe('getGalleryItems', () => {
    it('should return empty array for unknown user', async () => {
      const mod = await importModule();
      const items = mod.getGalleryItems('unknown-user');

      expect(items).toEqual([]);
    });
  });

  describe('getGalleryItem', () => {
    it('should return null for unknown item', async () => {
      const mod = await importModule();
      const item = mod.getGalleryItem('nonexistent-id');

      expect(item).toBeNull();
    });
  });

  describe('addGalleryItem', () => {
    it('should add an item and return it', async () => {
      const mod = await importModule();

      const item = await mod.addGalleryItem({
        userId: 'user-1',
        imageDataUrl: createPngDataUrl('image-data'),
        thumbnailDataUrl: createPngDataUrl('thumb-data'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      expect(item).toBeDefined();
      expect(item.id).toMatch(/^gal_/);
      expect(item.userId).toBe('user-1');
      expect(item.artStyleId).toBe('baroque');
      expect(item.artStyleName).toBe('バロック');
      expect(item.imageFileName).toMatch(/\.png$/);
      expect(item.createdAt).toBeTruthy();
    });

    it('should be retrievable via getGalleryItem after adding', async () => {
      const mod = await importModule();

      const added = await mod.addGalleryItem({
        userId: 'user-2',
        imageDataUrl: createPngDataUrl('data'),
        thumbnailDataUrl: createPngDataUrl('data'),
        artStyleId: 'anime',
        artStyleName: 'アニメ',
      });

      const retrieved = mod.getGalleryItem(added.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(added.id);
    });

    it('should be retrievable via getGalleryItems after adding', async () => {
      const mod = await importModule();

      await mod.addGalleryItem({
        userId: 'user-3',
        imageDataUrl: createPngDataUrl('data'),
        thumbnailDataUrl: createPngDataUrl('data'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      const items = mod.getGalleryItems('user-3');
      expect(items).toHaveLength(1);
      expect(items[0].userId).toBe('user-3');
    });

    it('should return items sorted by newest first', async () => {
      const mod = await importModule();

      const item1 = await mod.addGalleryItem({
        userId: 'user-4',
        imageDataUrl: createPngDataUrl('first'),
        thumbnailDataUrl: createPngDataUrl('first'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      // Small delay to ensure different createdAt timestamps
      await new Promise(r => setTimeout(r, 10));

      const item2 = await mod.addGalleryItem({
        userId: 'user-4',
        imageDataUrl: createPngDataUrl('second'),
        thumbnailDataUrl: createPngDataUrl('second'),
        artStyleId: 'anime',
        artStyleName: 'アニメ',
      });

      const items = mod.getGalleryItems('user-4');
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe(item2.id); // newer first
      expect(items[1].id).toBe(item1.id);
    });

    it('should throw for invalid image data URL', async () => {
      const mod = await importModule();

      await expect(
        mod.addGalleryItem({
          userId: 'user-5',
          imageDataUrl: 'not-a-data-url',
          thumbnailDataUrl: createPngDataUrl('thumb'),
          artStyleId: 'baroque',
          artStyleName: 'バロック',
        }),
      ).rejects.toThrow('Invalid image data URL');
    });

    it('should handle JPEG image data URLs', async () => {
      const mod = await importModule();

      const item = await mod.addGalleryItem({
        userId: 'user-6',
        imageDataUrl: createJpegDataUrl('jpeg-data'),
        thumbnailDataUrl: createJpegDataUrl('thumb'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      expect(item.imageFileName).toMatch(/\.jpg$/);
    });

    it('should set separate thumbnail filename even when same data URL is provided', async () => {
      const mod = await importModule();
      const sameDataUrl = createPngDataUrl('same-data');

      const item = await mod.addGalleryItem({
        userId: 'user-7',
        imageDataUrl: sameDataUrl,
        thumbnailDataUrl: sameDataUrl,
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      // thumbnailFileName is always generated as ${id}_thumb.${ext} when parsedThumb is valid
      expect(item.thumbnailFileName).toContain('_thumb');
      expect(item.imageFileName).not.toContain('_thumb');
    });
  });

  describe('deleteGalleryItem', () => {
    it('should delete an existing item', async () => {
      const mod = await importModule();

      const added = await mod.addGalleryItem({
        userId: 'user-del-1',
        imageDataUrl: createPngDataUrl('to-delete'),
        thumbnailDataUrl: createPngDataUrl('to-delete'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      const result = await mod.deleteGalleryItem('user-del-1', added.id);
      expect(result).toBe(true);

      const retrieved = mod.getGalleryItem(added.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent item', async () => {
      const mod = await importModule();

      const result = await mod.deleteGalleryItem('user-del-2', 'nonexistent-id');
      expect(result).toBe(false);
    });

    it('should return false when userId does not match', async () => {
      const mod = await importModule();

      const added = await mod.addGalleryItem({
        userId: 'user-del-3',
        imageDataUrl: createPngDataUrl('data'),
        thumbnailDataUrl: createPngDataUrl('data'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      const result = await mod.deleteGalleryItem('different-user', added.id);
      expect(result).toBe(false);

      // Item should still exist
      const retrieved = mod.getGalleryItem(added.id);
      expect(retrieved).not.toBeNull();
    });

    it('should remove item from getGalleryItems after deletion', async () => {
      const mod = await importModule();

      const added = await mod.addGalleryItem({
        userId: 'user-del-4',
        imageDataUrl: createPngDataUrl('data'),
        thumbnailDataUrl: createPngDataUrl('data'),
        artStyleId: 'baroque',
        artStyleName: 'バロック',
      });

      await mod.deleteGalleryItem('user-del-4', added.id);

      const items = mod.getGalleryItems('user-del-4');
      expect(items).toHaveLength(0);
    });
  });

  describe('galleryHydrationReady', () => {
    it('should resolve without error when Supabase is not configured', async () => {
      const mod = await importModule();

      await expect(mod.galleryHydrationReady).resolves.toBeUndefined();
    });
  });
});
