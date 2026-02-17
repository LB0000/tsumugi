import { config } from '../config.js';
import { logger } from './logger.js';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import {
  hasSupabaseConfig,
  selectRows,
  deleteOrphanedRows,
  upsertRows,
} from './supabaseClient.js';
import type { OrderPaymentStatus, ProcessedWebhookEvent, PersistedCheckoutState } from './checkoutTypes.js';

interface SupabaseOrderRow {
  order_id: string;
  payment_id: string;
  status: string;
  user_id: string | null;
  total_amount: number | null;
  items: unknown;
  shipping_address: unknown;
  gift_info: unknown;
  receipt_url: string | null;
  coupon_code: string | null;
  coupon_used: boolean;
  created_at: string | null;
  updated_at: string;
}

interface SupabaseWebhookEventRow {
  event_id: string;
  event_type: string;
  order_id: string | null;
  payment_id: string | null;
  status: string | null;
  received_at: string;
}

function toOrderRow(order: OrderPaymentStatus): SupabaseOrderRow {
  return {
    order_id: order.orderId,
    payment_id: order.paymentId,
    status: order.status,
    user_id: order.userId ?? null,
    total_amount: order.totalAmount ?? null,
    items: order.items ?? [],
    shipping_address: order.shippingAddress ?? null,
    gift_info: order.giftInfo ?? null,
    receipt_url: order.receiptUrl ?? null,
    coupon_code: order.couponCode ?? null,
    coupon_used: order.couponUsed ?? false,
    created_at: order.createdAt ?? null,
    updated_at: order.updatedAt,
  };
}

function fromOrderRow(row: SupabaseOrderRow): OrderPaymentStatus {
  const order: OrderPaymentStatus = {
    orderId: row.order_id,
    paymentId: row.payment_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
  if (row.user_id != null) order.userId = row.user_id;
  if (row.total_amount != null) order.totalAmount = row.total_amount;
  if (row.items && Array.isArray(row.items) && row.items.length > 0) order.items = row.items as OrderPaymentStatus['items'];
  if (row.shipping_address && typeof row.shipping_address === 'object') order.shippingAddress = row.shipping_address as OrderPaymentStatus['shippingAddress'];
  if (row.gift_info && typeof row.gift_info === 'object') order.giftInfo = row.gift_info as OrderPaymentStatus['giftInfo'];
  if (row.receipt_url != null) order.receiptUrl = row.receipt_url;
  if (row.coupon_code != null) order.couponCode = row.coupon_code;
  if (row.coupon_used != null) order.couponUsed = row.coupon_used;
  if (row.created_at != null) order.createdAt = row.created_at;
  return order;
}

function toWebhookEventRow(event: ProcessedWebhookEvent): SupabaseWebhookEventRow {
  return {
    event_id: event.eventId,
    event_type: event.eventType,
    order_id: event.orderId ?? null,
    payment_id: event.paymentId ?? null,
    status: event.status ?? null,
    received_at: event.receivedAt,
  };
}

function fromWebhookEventRow(row: SupabaseWebhookEventRow): ProcessedWebhookEvent {
  const event: ProcessedWebhookEvent = {
    eventId: row.event_id,
    eventType: row.event_type,
    receivedAt: row.received_at,
  };
  if (row.order_id) event.orderId = row.order_id;
  if (row.payment_id) event.paymentId = row.payment_id;
  if (row.status) event.status = row.status;
  return event;
}

function getDefaultCheckoutState(): PersistedCheckoutState {
  return {
    version: 1,
    processedEvents: [],
    paymentStatuses: [],
  };
}

async function loadCheckoutFromSupabase(): Promise<PersistedCheckoutState> {
  const [orders, events] = await Promise.all([
    selectRows<SupabaseOrderRow>(
      config.SUPABASE_CHECKOUT_ORDERS_TABLE,
      'order_id,payment_id,status,user_id,total_amount,items,shipping_address,gift_info,receipt_url,coupon_code,coupon_used,created_at,updated_at',
    ),
    selectRows<SupabaseWebhookEventRow>(
      config.SUPABASE_CHECKOUT_EVENTS_TABLE,
      'event_id,event_type,order_id,payment_id,status,received_at',
    ),
  ]);

  return {
    version: 1,
    paymentStatuses: orders.map(fromOrderRow),
    processedEvents: events.map(fromWebhookEventRow),
  };
}

async function persistCheckoutToSupabase(snapshot: PersistedCheckoutState): Promise<void> {
  const orderRows = snapshot.paymentStatuses.map(toOrderRow);
  const eventRows = snapshot.processedEvents.map(toWebhookEventRow);

  // Step 1: Upsert current data
  await upsertRows(config.SUPABASE_CHECKOUT_ORDERS_TABLE, orderRows, 'order_id');
  await upsertRows(config.SUPABASE_CHECKOUT_EVENTS_TABLE, eventRows, 'event_id');

  // Step 2: Delete orphaned rows
  await deleteOrphanedRows(
    config.SUPABASE_CHECKOUT_ORDERS_TABLE,
    'order_id',
    orderRows.map((r) => r.order_id),
  );
  await deleteOrphanedRows(
    config.SUPABASE_CHECKOUT_EVENTS_TABLE,
    'event_id',
    eventRows.map((r) => r.event_id),
  );
}

export async function loadCheckoutStateSnapshot(filePath: string): Promise<PersistedCheckoutState> {
  const fallback = getDefaultCheckoutState();

  if (!hasSupabaseConfig()) {
    return readJsonFile(filePath, fallback);
  }

  const localData = readJsonFile(filePath, fallback);

  try {
    const remote = await loadCheckoutFromSupabase();
    if (remote.paymentStatuses.length === 0 && remote.processedEvents.length === 0) {
      if (localData.paymentStatuses.length > 0 || localData.processedEvents.length > 0) {
        return localData;
      }
    }
    return remote;
  } catch (error) {
    logger.error('Failed to load checkout state from Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return localData;
}

export async function persistCheckoutStateSnapshot(filePath: string, snapshot: PersistedCheckoutState): Promise<void> {
  if (!hasSupabaseConfig()) {
    await writeJsonAtomic(filePath, snapshot);
    return;
  }

  try {
    await persistCheckoutToSupabase(snapshot);
    return;
  } catch (error) {
    logger.error('Failed to persist checkout state to Supabase.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await writeJsonAtomic(filePath, snapshot);
}
