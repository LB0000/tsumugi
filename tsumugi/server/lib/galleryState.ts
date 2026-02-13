import path from 'path';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { readJsonFile, writeJsonAtomic } from './persistence.js';

export interface GalleryItem {
  id: string;
  userId: string;
  imageFileName: string;
  thumbnailFileName: string;
  artStyleId: string;
  artStyleName: string;
  createdAt: string;
}

interface PersistedGalleryState {
  version: number;
  items: GalleryItem[];
}

const GALLERY_STATE_PATH = path.resolve(process.cwd(), 'server', '.data', 'gallery-state.json');
const GALLERY_FILES_DIR = path.resolve(process.cwd(), 'server', '.data', 'gallery');
const MAX_ITEMS_PER_USER = 20;

const itemsById = new Map<string, GalleryItem>();
const itemsByUserId = new Map<string, GalleryItem[]>();
let persistQueue: Promise<void> = Promise.resolve();

function createId(): string {
  return `gal_${randomBytes(10).toString('hex')}`;
}

function persistGalleryState(): void {
  const snapshot: PersistedGalleryState = {
    version: 1,
    items: [...itemsById.values()],
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(GALLERY_STATE_PATH, snapshot))
    .catch((error) => {
      console.error('Failed to persist gallery state:', error);
    });
}

function isGalleryItem(value: unknown): value is GalleryItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.imageFileName === 'string' &&
    typeof obj.thumbnailFileName === 'string' &&
    typeof obj.artStyleId === 'string' &&
    typeof obj.artStyleName === 'string' &&
    typeof obj.createdAt === 'string'
  );
}

function hydrateGalleryState(): void {
  const parsed = readJsonFile<PersistedGalleryState>(GALLERY_STATE_PATH, {
    version: 1,
    items: [],
  });

  for (const item of parsed.items) {
    if (!isGalleryItem(item)) continue;
    itemsById.set(item.id, item);
    const userItems = itemsByUserId.get(item.userId) ?? [];
    userItems.push(item);
    itemsByUserId.set(item.userId, userItems);
  }
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: Buffer; ext: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const data = Buffer.from(match[2], 'base64');
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return { mimeType, data, ext };
}

export async function addGalleryItem(params: {
  userId: string;
  imageDataUrl: string;
  thumbnailDataUrl: string;
  artStyleId: string;
  artStyleName: string;
}): Promise<GalleryItem> {
  const userItems = itemsByUserId.get(params.userId) ?? [];

  // Evict oldest if at limit
  if (userItems.length >= MAX_ITEMS_PER_USER) {
    const oldest = userItems.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (oldest) {
      await deleteGalleryItem(params.userId, oldest.id);
    }
  }

  const id = createId();
  const parsedImage = parseDataUrl(params.imageDataUrl);
  const parsedThumb = parseDataUrl(params.thumbnailDataUrl);

  if (!parsedImage) throw new Error('Invalid image data URL');

  await fs.mkdir(GALLERY_FILES_DIR, { recursive: true });

  const imageFileName = `${id}.${parsedImage.ext}`;
  const thumbnailFileName = parsedThumb ? `${id}_thumb.${parsedThumb.ext}` : imageFileName;
  const shouldWriteThumbnailFile = Boolean(
    parsedThumb &&
    params.thumbnailDataUrl !== params.imageDataUrl &&
    thumbnailFileName !== imageFileName
  );

  await fs.writeFile(getGalleryImagePath(imageFileName), parsedImage.data);
  if (shouldWriteThumbnailFile && parsedThumb) {
    await fs.writeFile(getGalleryImagePath(thumbnailFileName), parsedThumb.data);
  }

  const item: GalleryItem = {
    id,
    userId: params.userId,
    imageFileName,
    thumbnailFileName,
    artStyleId: params.artStyleId,
    artStyleName: params.artStyleName,
    createdAt: new Date().toISOString(),
  };

  itemsById.set(id, item);
  const currentUserItems = itemsByUserId.get(params.userId) ?? [];
  currentUserItems.push(item);
  itemsByUserId.set(params.userId, currentUserItems);

  persistGalleryState();
  return item;
}

export function getGalleryItems(userId: string): GalleryItem[] {
  const items = itemsByUserId.get(userId) ?? [];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGalleryItem(id: string): GalleryItem | null {
  return itemsById.get(id) ?? null;
}

export function getGalleryImagePath(fileName: string): string {
  const resolved = path.resolve(GALLERY_FILES_DIR, fileName);
  const basePath = `${GALLERY_FILES_DIR}${path.sep}`;
  if (resolved !== GALLERY_FILES_DIR && !resolved.startsWith(basePath)) {
    throw new Error('Invalid gallery file path');
  }
  return resolved;
}

export async function deleteGalleryItem(userId: string, itemId: string): Promise<boolean> {
  const item = itemsById.get(itemId);
  if (!item || item.userId !== userId) return false;

  itemsById.delete(itemId);
  const userItems = itemsByUserId.get(userId);
  if (userItems) {
    const idx = userItems.findIndex((i) => i.id === itemId);
    if (idx !== -1) userItems.splice(idx, 1);
  }

  // Clean up files
  try {
    await fs.unlink(getGalleryImagePath(item.imageFileName));
  } catch { /* file may not exist */ }
  if (item.thumbnailFileName !== item.imageFileName) {
    try {
      await fs.unlink(getGalleryImagePath(item.thumbnailFileName));
    } catch { /* file may not exist */ }
  }

  persistGalleryState();
  return true;
}

hydrateGalleryState();
