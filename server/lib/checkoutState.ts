import path from 'path';
import { readJsonFile, writeJsonAtomic } from './persistence.js';
import { logger } from './logger.js';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderShippingAddress {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
}

export interface OrderGiftInfo {
  wrappingId?: string;
  noshiType?: string;
  messageCard?: string;
  recipientAddress?: OrderShippingAddress;
}

export interface OrderPaymentStatus {
  orderId: string;
  paymentId: string;
  status: string;
  updatedAt: string;
  userId?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: OrderItem[];
  shippingAddress?: OrderShippingAddress;
  receiptUrl?: string;
  couponCode?: string;
  couponUsed?: boolean;
  giftInfo?: OrderGiftInfo;
}

export interface ProcessedWebhookEvent {
  eventId: string;
  eventType: string;
  receivedAt: string;
  orderId?: string;
  paymentId?: string;
  status?: string;
}

interface PersistedCheckoutState {
  version: number;
  processedEvents: ProcessedWebhookEvent[];
  paymentStatuses: OrderPaymentStatus[];
}

const CHECKOUT_STATE_PATH = path.resolve(process.cwd(), 'server', '.data', 'checkout-state.json');
const MAX_STORED_EVENTS = 5000;
const processedEventIds = new Set<string>();
const processedEventsQueue: ProcessedWebhookEvent[] = [];
let processedEventsHead = 0;
const paymentStatusByOrderId = new Map<string, OrderPaymentStatus>();
let persistQueue: Promise<void> = Promise.resolve();

function processedEventsSize(): number {
  return processedEventsQueue.length - processedEventsHead;
}

function getPersistedProcessedEvents(): ProcessedWebhookEvent[] {
  return processedEventsHead === 0
    ? processedEventsQueue
    : processedEventsQueue.slice(processedEventsHead);
}

function popOldestProcessedEvent(): ProcessedWebhookEvent | undefined {
  if (processedEventsHead >= processedEventsQueue.length) return undefined;
  const oldest = processedEventsQueue[processedEventsHead];
  processedEventsHead += 1;

  // Compact occasionally to keep memory bounded and array operations fast.
  if (processedEventsHead > 1024 && processedEventsHead * 2 >= processedEventsQueue.length) {
    processedEventsQueue.splice(0, processedEventsHead);
    processedEventsHead = 0;
  }
  return oldest;
}

function isProcessedWebhookEvent(value: unknown): value is ProcessedWebhookEvent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.eventId === 'string' &&
    typeof obj.eventType === 'string' &&
    typeof obj.receivedAt === 'string' &&
    (obj.orderId === undefined || typeof obj.orderId === 'string') &&
    (obj.paymentId === undefined || typeof obj.paymentId === 'string') &&
    (obj.status === undefined || typeof obj.status === 'string')
  );
}

function isOrderPaymentStatus(value: unknown): value is OrderPaymentStatus {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.orderId === 'string' &&
    typeof obj.paymentId === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

function persistCheckoutState(): void {
  const snapshot: PersistedCheckoutState = {
    version: 1,
    processedEvents: [...getPersistedProcessedEvents()],
    paymentStatuses: [...paymentStatusByOrderId.values()],
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(CHECKOUT_STATE_PATH, snapshot))
    .catch((error) => {
      logger.error('Failed to persist checkout state', { error: error instanceof Error ? error.message : String(error) });
    });
}

function hydrateCheckoutState(): void {
  const parsed = readJsonFile<PersistedCheckoutState>(CHECKOUT_STATE_PATH, {
    version: 1,
    processedEvents: [],
    paymentStatuses: [],
  });

  for (const event of parsed.processedEvents) {
    if (!isProcessedWebhookEvent(event)) continue;
    if (processedEventIds.has(event.eventId)) continue;
    processedEventIds.add(event.eventId);
    processedEventsQueue.push(event);
  }

  while (processedEventsSize() > MAX_STORED_EVENTS) {
    const removed = popOldestProcessedEvent();
    if (removed) {
      processedEventIds.delete(removed.eventId);
    }
  }

  for (const status of parsed.paymentStatuses) {
    if (!isOrderPaymentStatus(status)) continue;
    paymentStatusByOrderId.set(status.orderId, status);
  }
}

export function hasProcessedWebhookEvent(eventId: string): boolean {
  return processedEventIds.has(eventId);
}

export function markProcessedWebhookEvent(event: ProcessedWebhookEvent): void {
  if (processedEventIds.has(event.eventId)) return;
  processedEventIds.add(event.eventId);
  processedEventsQueue.push(event);

  if (processedEventsSize() > MAX_STORED_EVENTS) {
    const removed = popOldestProcessedEvent();
    if (removed) {
      processedEventIds.delete(removed.eventId);
    }
  }

  persistCheckoutState();
}

export function updateOrderPaymentStatus(status: OrderPaymentStatus): void {
  paymentStatusByOrderId.set(status.orderId, status);
  persistCheckoutState();
}

export function getOrderPaymentStatus(orderId: string): OrderPaymentStatus | null {
  return paymentStatusByOrderId.get(orderId) ?? null;
}

export function claimCouponUsage(orderId: string): boolean {
  const status = getOrderPaymentStatus(orderId);
  if (!status || status.couponUsed || !status.couponCode) return false;
  // Synchronously set the flag (safe in Node.js single-threaded model)
  status.couponUsed = true;
  persistCheckoutState();
  return true;
}

export function unclaimCouponUsage(orderId: string): void {
  const status = getOrderPaymentStatus(orderId);
  if (status) {
    status.couponUsed = false;
    persistCheckoutState();
  }
}

export function getOrdersByUserId(userId: string): OrderPaymentStatus[] {
  const orders: OrderPaymentStatus[] = [];
  for (const status of paymentStatusByOrderId.values()) {
    if (status.userId === userId) {
      orders.push(status);
    }
  }
  return orders.sort((a, b) => {
    const dateA = a.createdAt || a.updatedAt;
    const dateB = b.createdAt || b.updatedAt;
    return dateB.localeCompare(dateA);
  });
}

export function getAllOrdersGroupedByUserId(): Map<string, OrderPaymentStatus[]> {
  const grouped = new Map<string, OrderPaymentStatus[]>();
  for (const status of paymentStatusByOrderId.values()) {
    if (!status.userId) continue;
    const list = grouped.get(status.userId);
    if (list) {
      list.push(status);
    } else {
      grouped.set(status.userId, [status]);
    }
  }
  return grouped;
}

hydrateCheckoutState();
