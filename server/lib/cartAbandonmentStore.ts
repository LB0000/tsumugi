import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';

export interface SavedCart {
  userId: string;
  email: string;
  items: { name: string; price: number; quantity: number }[];
  savedAt: string;
  emailSent: boolean;
}

interface SupabaseSavedCartRow {
  user_id: string;
  email: string;
  items: { name: string; price: number; quantity: number }[];
  saved_at: string;
  email_sent: boolean;
}

function toRow(cart: SavedCart): SupabaseSavedCartRow {
  return {
    user_id: cart.userId,
    email: cart.email,
    items: cart.items,
    saved_at: cart.savedAt,
    email_sent: cart.emailSent,
  };
}

function fromRow(row: SupabaseSavedCartRow): SavedCart {
  return {
    userId: row.user_id,
    email: row.email,
    items: Array.isArray(row.items) ? row.items : [],
    savedAt: row.saved_at,
    emailSent: row.email_sent,
  };
}

async function loadFromSupabase(): Promise<SavedCart[]> {
  const rows = await selectRows<SupabaseSavedCartRow>(
    config.SUPABASE_SAVED_CARTS_TABLE,
    'user_id,email,items,saved_at,email_sent',
  );
  return rows.map(fromRow);
}

async function persistToSupabase(carts: SavedCart[]): Promise<void> {
  const rows = carts.map(toRow);

  await upsertRows(config.SUPABASE_SAVED_CARTS_TABLE, rows, 'user_id');
  await deleteOrphanedRows(
    config.SUPABASE_SAVED_CARTS_TABLE,
    'user_id',
    rows.map((r) => r.user_id),
  );
}

export async function loadSavedCartsSnapshot(filePath: string): Promise<SavedCart[]> {
  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, []);
  }

  const localData = readJsonFile<SavedCart[]>(filePath, []);

  try {
    const remote = await loadFromSupabase();
    if (remote.length === 0 && localData.length > 0) {
      return localData;
    }
    return remote;
  } catch (error) {
    logger.error('Failed to load saved carts from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localData;
}

export async function persistSavedCartsSnapshot(filePath: string, carts: SavedCart[]): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, carts);
    return;
  }

  try {
    await persistToSupabase(carts);
    return;
  } catch (error) {
    logger.error('Failed to persist saved carts to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, carts);
}
