vi.mock('../../lib/persistence.js', () => ({
  readJsonFile: (_path: string, fallback: unknown) => fallback,
  writeJsonAtomic: async () => {},
}));

import {
  hasProcessedWebhookEvent,
  markProcessedWebhookEvent,
  updateOrderPaymentStatus,
  getOrderPaymentStatus,
  getOrdersByUserId,
} from '../../lib/checkoutState.js';

describe('hasProcessedWebhookEvent / markProcessedWebhookEvent', () => {
  it('returns false for an unprocessed event', () => {
    expect(hasProcessedWebhookEvent('never-seen')).toBe(false);
  });

  it('returns true after marking an event as processed', () => {
    markProcessedWebhookEvent({
      eventId: 'evt-1',
      eventType: 'payment.completed',
      receivedAt: '2026-01-01T00:00:00Z',
    });
    expect(hasProcessedWebhookEvent('evt-1')).toBe(true);
  });

  it('does not duplicate an already-processed event', () => {
    markProcessedWebhookEvent({
      eventId: 'evt-dup',
      eventType: 'payment.completed',
      receivedAt: '2026-01-01T00:00:00Z',
    });
    markProcessedWebhookEvent({
      eventId: 'evt-dup',
      eventType: 'payment.completed',
      receivedAt: '2026-01-01T00:00:00Z',
    });
    expect(hasProcessedWebhookEvent('evt-dup')).toBe(true);
  });
});

describe('updateOrderPaymentStatus / getOrderPaymentStatus', () => {
  it('returns null for an unknown order', () => {
    expect(getOrderPaymentStatus('nonexistent')).toBeNull();
  });

  it('stores and retrieves a payment status', () => {
    updateOrderPaymentStatus({
      orderId: 'order-1',
      paymentId: 'pay-1',
      status: 'COMPLETED',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const status = getOrderPaymentStatus('order-1');
    expect(status).not.toBeNull();
    expect(status!.orderId).toBe('order-1');
    expect(status!.paymentId).toBe('pay-1');
    expect(status!.status).toBe('COMPLETED');
  });

  it('overwrites an existing status for the same order', () => {
    updateOrderPaymentStatus({
      orderId: 'order-2',
      paymentId: 'pay-2a',
      status: 'PENDING',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    updateOrderPaymentStatus({
      orderId: 'order-2',
      paymentId: 'pay-2b',
      status: 'COMPLETED',
      updatedAt: '2026-01-02T00:00:00Z',
    });
    expect(getOrderPaymentStatus('order-2')!.paymentId).toBe('pay-2b');
  });
});

describe('getOrdersByUserId', () => {
  it('filters orders by userId', () => {
    updateOrderPaymentStatus({
      orderId: 'user-order-1',
      paymentId: 'p1',
      status: 'COMPLETED',
      updatedAt: '2026-01-01T00:00:00Z',
      userId: 'user-A',
      createdAt: '2026-01-01T00:00:00Z',
    });
    updateOrderPaymentStatus({
      orderId: 'user-order-2',
      paymentId: 'p2',
      status: 'COMPLETED',
      updatedAt: '2026-01-02T00:00:00Z',
      userId: 'user-B',
      createdAt: '2026-01-02T00:00:00Z',
    });
    updateOrderPaymentStatus({
      orderId: 'user-order-3',
      paymentId: 'p3',
      status: 'PENDING',
      updatedAt: '2026-01-03T00:00:00Z',
      userId: 'user-A',
      createdAt: '2026-01-03T00:00:00Z',
    });

    const ordersA = getOrdersByUserId('user-A');
    expect(ordersA).toHaveLength(2);
    expect(ordersA.every((o) => o.userId === 'user-A')).toBe(true);
  });

  it('returns orders sorted by date descending (newest first)', () => {
    const orders = getOrdersByUserId('user-A');
    expect(orders[0].orderId).toBe('user-order-3');
    expect(orders[1].orderId).toBe('user-order-1');
  });

  it('returns an empty array for a user with no orders', () => {
    expect(getOrdersByUserId('user-Z')).toEqual([]);
  });
});
