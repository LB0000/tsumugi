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
  const item = getGalleryItem(req.params.id);
  if (!item || item.userId !== user.id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  try {
    const filePath = getGalleryImagePath(item.imageFileName);
    const data = await fs.readFile(filePath);
    const ext = item.imageFileName.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(data);
  } catch {
    res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: '画像ファイルが見つかりません' } });
  }
});

// GET /api/gallery/:id/thumbnail — serve thumbnail
galleryRouter.get('/:id/thumbnail', requireAuth, async (req, res) => {
  const user = getAuthUser(res);
  const item = getGalleryItem(req.params.id);
  if (!item || item.userId !== user.id) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  try {
    const filePath = getGalleryImagePath(item.thumbnailFileName);
    const data = await fs.readFile(filePath);
    const ext = item.thumbnailFileName.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(data);
  } catch {
    res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'サムネイルが見つかりません' } });
  }
});

// DELETE /api/gallery/:id — delete a gallery item
galleryRouter.delete('/:id', requireAuth, async (req, res) => {
  const user = getAuthUser(res);
  const deleted = await deleteGalleryItem(user.id, req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  res.json({ success: true });
});
