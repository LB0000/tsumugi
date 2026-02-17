import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';

export interface ScheduledEmail {
  id: string;
  type: 'review_request';
  to: string;
  orderId: string;
  userName: string;
  scheduledAt: string;
  sent: boolean;
}

interface SupabaseScheduledEmailRow {
  id: string;
  type: string;
  to_address: string;
  order_id: string;
  user_name: string;
  scheduled_at: string;
  sent: boolean;
}

function toRow(entry: ScheduledEmail): SupabaseScheduledEmailRow {
  return {
    id: entry.id,
    type: entry.type,
    to_address: entry.to,
    order_id: entry.orderId,
    user_name: entry.userName,
    scheduled_at: entry.scheduledAt,
    sent: entry.sent,
  };
}

function fromRow(row: SupabaseScheduledEmailRow): ScheduledEmail {
  return {
    id: row.id,
    type: row.type as 'review_request',
    to: row.to_address,
    orderId: row.order_id,
    userName: row.user_name,
    scheduledAt: row.scheduled_at,
    sent: row.sent,
  };
}

async function loadFromSupabase(): Promise<ScheduledEmail[]> {
  const rows = await selectRows<SupabaseScheduledEmailRow>(
    config.SUPABASE_SCHEDULED_EMAILS_TABLE,
    'id,type,to_address,order_id,user_name,scheduled_at,sent',
  );
  return rows.map(fromRow);
}

async function persistToSupabase(emails: ScheduledEmail[]): Promise<void> {
  const rows = emails.map(toRow);

  await upsertRows(config.SUPABASE_SCHEDULED_EMAILS_TABLE, rows, 'id');
  await deleteOrphanedRows(
    config.SUPABASE_SCHEDULED_EMAILS_TABLE,
    'id',
    rows.map((r) => r.id),
  );
}

export async function loadScheduledEmailsSnapshot(filePath: string): Promise<ScheduledEmail[]> {
  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, []);
  }

  const localData = readJsonFile<ScheduledEmail[]>(filePath, []);

  try {
    const remote = await loadFromSupabase();
    if (remote.length === 0 && localData.length > 0) {
      return localData;
    }
    return remote;
  } catch (error) {
    logger.error('Failed to load scheduled emails from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localData;
}

export async function persistScheduledEmailsSnapshot(filePath: string, emails: ScheduledEmail[]): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, emails);
    return;
  }

  try {
    await persistToSupabase(emails);
    return;
  } catch (error) {
    logger.error('Failed to persist scheduled emails to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, emails);
}
