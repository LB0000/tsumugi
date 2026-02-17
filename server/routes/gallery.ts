import { Router } from 'express';
import { promises as fs } from 'fs';
import {
  getGalleryItems,
  getGalleryItem,
  getGalleryImagePath,
  deleteGalleryItem,
} from '../lib/galleryState.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { logger } from '../lib/logger.js';

export const galleryRouter = Router();
galleryRouter.use(csrfProtection({ methods: ['DELETE'] }));

// GET /api/gallery — list user's gallery items (metadata only)
galleryRouter.get('/', requireAuth, (req, res) => {
  const user = getAuthUser(res);
  const items = getGalleryItems(user.id);
  res.json({ success: true, items });
});

// GET /api/gallery/:id/image — serve full image
galleryRouter.get('/:id/image', requireAuth, async (req, res) => {
  const user = getAuthUser(res);
  const itemId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^gal_[a-f0-9]+$/.test(itemId)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  const item = getGalleryItem(itemId);
  if (!item || item.userId !== user.id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  try {
    const filePath = getGalleryImagePath(item.imageFileName);
    const MAX_GALLERY_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_GALLERY_FILE_SIZE) {
      res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'ファイルサイズが大きすぎます' } });
      return;
    }
    const data = await fs.readFile(filePath);
    const ext = item.imageFileName.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    logger.info('Gallery image served', { userId: user.id, itemId });
    res.send(data);
  } catch (error) {
    logger.warn('Gallery image not found', { userId: user.id, itemId, error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: '画像ファイルが見つかりません' } });
  }
});

// GET /api/gallery/:id/thumbnail — serve thumbnail
galleryRouter.get('/:id/thumbnail', requireAuth, async (req, res) => {
  const user = getAuthUser(res);
  const itemId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^gal_[a-f0-9]+$/.test(itemId)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  const item = getGalleryItem(itemId);
  if (!item || item.userId !== user.id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  try {
    const filePath = getGalleryImagePath(item.thumbnailFileName);
    const MAX_GALLERY_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_GALLERY_FILE_SIZE) {
      res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'ファイルサイズが大きすぎます' } });
      return;
    }
    const data = await fs.readFile(filePath);
    const ext = item.thumbnailFileName.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    logger.info('Gallery thumbnail served', { userId: user.id, itemId });
    res.send(data);
  } catch (error) {
    logger.warn('Gallery thumbnail not found', { userId: user.id, itemId, error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'サムネイルが見つかりません' } });
  }
});

// DELETE /api/gallery/:id — delete a gallery item
galleryRouter.delete('/:id', requireAuth, async (req, res) => {
  const user = getAuthUser(res);
  const itemId = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^gal_[a-f0-9]+$/.test(itemId)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  const deleted = await deleteGalleryItem(user.id, itemId);
  if (!deleted) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  logger.info('Gallery item deleted', { userId: user.id, itemId });
  res.json({ success: true });
});
