import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';

export interface GalleryItem {
  id: string;
  userId: string;
  imageFileName: string;
  thumbnailFileName: string;
  artStyleId: string;
  artStyleName: string;
  createdAt: string;
}

export interface PersistedGalleryState {
  version: number;
  items: GalleryItem[];
}

interface SupabaseGalleryRow {
  id: string;
  user_id: string;
  image_file_name: string;
  thumbnail_file_name: string;
  art_style_id: string;
  art_style_name: string;
  created_at: string;
}

function toRow(item: GalleryItem): SupabaseGalleryRow {
  return {
    id: item.id,
    user_id: item.userId,
    image_file_name: item.imageFileName,
    thumbnail_file_name: item.thumbnailFileName,
    art_style_id: item.artStyleId,
    art_style_name: item.artStyleName,
    created_at: item.createdAt,
  };
}

function fromRow(row: SupabaseGalleryRow): GalleryItem {
  return {
    id: row.id,
    userId: row.user_id,
    imageFileName: row.image_file_name,
    thumbnailFileName: row.thumbnail_file_name,
    artStyleId: row.art_style_id,
    artStyleName: row.art_style_name,
    createdAt: row.created_at,
  };
}

function getDefaultSnapshot(): PersistedGalleryState {
  return { version: 1, items: [] };
}

async function loadFromSupabase(): Promise<PersistedGalleryState> {
  const rows = await selectRows<SupabaseGalleryRow>(
    config.SUPABASE_GALLERY_TABLE,
    'id,user_id,image_file_name,thumbnail_file_name,art_style_id,art_style_name,created_at',
  );
  return {
    version: 1,
    items: rows.map(fromRow),
  };
}

async function persistToSupabase(snapshot: PersistedGalleryState): Promise<void> {
  const rows = snapshot.items.map(toRow);

  await upsertRows(config.SUPABASE_GALLERY_TABLE, rows, 'id');
  await deleteOrphanedRows(
    config.SUPABASE_GALLERY_TABLE,
    'id',
    rows.map((r) => r.id),
  );
}

export async function loadGallerySnapshot(filePath: string): Promise<PersistedGalleryState> {
  const fallback = getDefaultSnapshot();

  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, fallback);
  }

  const localData = readJsonFile(filePath, fallback);

  try {
    const remote = await loadFromSupabase();
    if (remote.items.length === 0 && localData.items.length > 0) {
      return localData;
    }
    return remote;
  } catch (error) {
    logger.error('Failed to load gallery state from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localData;
}

export async function persistGallerySnapshot(filePath: string, snapshot: PersistedGalleryState): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, snapshot);
    return;
  }

  try {
    await persistToSupabase(snapshot);
    return;
  } catch (error) {
    logger.error('Failed to persist gallery state to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, snapshot);
}

