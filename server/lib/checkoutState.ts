import path from 'path';
import { readJsonFile, writeJsonAtomic } from './persistence.js';

export interface OrderPaymentStatus {
  orderId: string;
  paymentId: string;
  status: string;
  updatedAt: string;
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
const paymentStatusByOrderId = new Map<string, OrderPaymentStatus>();
let persistQueue: Promise<void> = Promise.resolve();

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
    processedEvents: processedEventsQueue,
    paymentStatuses: [...paymentStatusByOrderId.values()],
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(CHECKOUT_STATE_PATH, snapshot))
    .catch((error) => {
      console.error('Failed to persist checkout state:', error);
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

  if (processedEventsQueue.length > MAX_STORED_EVENTS) {
    const overflow = processedEventsQueue.length - MAX_STORED_EVENTS;
    for (let i = 0; i < overflow; i += 1) {
      const removed = processedEventsQueue.shift();
      if (removed) {
        processedEventIds.delete(removed.eventId);
      }
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

  if (processedEventsQueue.length > MAX_STORED_EVENTS) {
    const removed = processedEventsQueue.shift();
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

hydrateCheckoutState();
