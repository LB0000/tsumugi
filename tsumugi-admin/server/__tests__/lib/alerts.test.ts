import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const _chainable = (result?: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'insert', 'update', 'set', 'values', 'delete'];
    for (const m of methods) { chain[m] = vi.fn(() => chain); }
    chain.get = vi.fn(() => result);
    chain.all = vi.fn(() => (Array.isArray(result) ? result : []));
    chain.run = vi.fn();
    return chain;
  };
  return {
    mockDb: {
      insert: vi.fn(() => _chainable()),
      select: vi.fn(() => _chainable()),
      update: vi.fn(() => _chainable()),
      delete: vi.fn(() => _chainable()),
      get: vi.fn(),
    },
    _chainable,
  };
});

vi.mock('../../db/index.js', () => ({ db: mockDb }));
vi.mock('../../db/schema.js', () => ({ alerts: {} }));
vi.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

import {
  createAlert,
  getUnreadCount,
  listAlerts,
  markAsRead,
  markAllAsRead,
  deleteAlert,
} from '../../lib/alerts.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createAlert', () => {
  it('inserts alert with correct fields', () => {
    createAlert({
      type: 'api_error',
      severity: 'warning',
      title: 'Test Alert',
      message: 'Something happened',
    });
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('stringifies metadata when provided', () => {
    const chain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(chain);

    createAlert({
      type: 'anomaly',
      severity: 'critical',
      title: 'Alert',
      message: 'msg',
      metadata: { key: 'value' },
    });

    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: '{"key":"value"}',
      }),
    );
  });

  it('sets metadata to null when not provided', () => {
    const chain = { values: vi.fn().mockReturnThis(), run: vi.fn() };
    mockDb.insert.mockReturnValue(chain);

    createAlert({
      type: 'sync_failure',
      severity: 'info',
      title: 'Alert',
      message: 'msg',
    });

    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: null,
      }),
    );
  });
});

describe('getUnreadCount', () => {
  it('returns count when unread alerts exist', () => {
    mockDb.get.mockReturnValue({ count: 5 });
    expect(getUnreadCount()).toBe(5);
  });

  it('returns 0 when no unread alerts', () => {
    mockDb.get.mockReturnValue({ count: 0 });
    expect(getUnreadCount()).toBe(0);
  });

  it('returns 0 when db returns null', () => {
    mockDb.get.mockReturnValue(null);
    expect(getUnreadCount()).toBe(0);
  });
});

describe('listAlerts', () => {
  it('returns all alerts with default limit', () => {
    const alerts = [{ id: '1', title: 'Test' }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      all: vi.fn(() => alerts),
    };
    mockDb.select.mockReturnValue(chain);

    const result = listAlerts();
    expect(result).toEqual(alerts);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('filters unread only when specified', () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      all: vi.fn(() => []),
    };
    mockDb.select.mockReturnValue(chain);

    listAlerts({ unreadOnly: true });
    expect(chain.where).toHaveBeenCalled();
  });
});

describe('markAsRead', () => {
  it('updates alert by id', () => {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    mockDb.update.mockReturnValue(chain);

    markAsRead('alert-1');
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true }),
    );
  });
});

describe('markAllAsRead', () => {
  it('updates all unread alerts', () => {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    mockDb.update.mockReturnValue(chain);

    markAllAsRead();
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect(chain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true }),
    );
  });
});

describe('deleteAlert', () => {
  it('deletes alert by id', () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };
    mockDb.delete.mockReturnValue(chain);

    deleteAlert('alert-1');
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });
});
