import { Router } from 'express';
import { promises as fs } from 'fs';
import { getUserBySessionToken } from '../lib/auth.js';
import {
  getGalleryItems,
  getGalleryItem,
  getGalleryImagePath,
  deleteGalleryItem,
} from '../lib/galleryState.js';
import {
  areTokensEqual,
  extractCsrfTokenFromCookie,
  extractCsrfTokenFromHeader,
  extractSessionTokenFromHeaders,
  isAllowedOrigin,
  type HeaderMap,
} from '../lib/requestAuth.js';

export const galleryRouter = Router();
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL;

function extractSessionToken(headers: HeaderMap): string | null {
  return extractSessionTokenFromHeaders(headers);
}

// GET /api/gallery — list user's gallery items (metadata only)
galleryRouter.get('/', (req, res) => {
  const headers = req.headers as HeaderMap;
  const token = extractSessionToken(headers);
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証情報がありません' } });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' } });
    return;
  }

  const items = getGalleryItems(user.id);
  res.json({ success: true, items });
});

// GET /api/gallery/:id/image — serve full image
galleryRouter.get('/:id/image', async (req, res) => {
  const headers = req.headers as HeaderMap;
  const token = extractSessionToken(headers);
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証情報がありません' } });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' } });
    return;
  }

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
galleryRouter.get('/:id/thumbnail', async (req, res) => {
  const headers = req.headers as HeaderMap;
  const token = extractSessionToken(headers);
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証情報がありません' } });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' } });
    return;
  }

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
galleryRouter.delete('/:id', async (req, res) => {
  const headers = req.headers as HeaderMap;
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (!isAllowedOrigin({ originHeader, frontendUrl, isProduction })) {
    res.status(403).json({ success: false, error: { code: 'ORIGIN_FORBIDDEN', message: '許可されていないオリジンです' } });
    return;
  }

  const csrfTokenFromCookie = extractCsrfTokenFromCookie(headers);
  const csrfTokenFromHeader = extractCsrfTokenFromHeader(headers);
  if (!csrfTokenFromCookie || !csrfTokenFromHeader || !areTokensEqual(csrfTokenFromCookie, csrfTokenFromHeader)) {
    res.status(403).json({ success: false, error: { code: 'CSRF_TOKEN_INVALID', message: 'CSRFトークンが無効です' } });
    return;
  }

  const token = extractSessionToken(headers);
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証情報がありません' } });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' } });
    return;
  }

  const deleted = await deleteGalleryItem(user.id, req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '画像が見つかりません' } });
    return;
  }

  res.json({ success: true });
});
