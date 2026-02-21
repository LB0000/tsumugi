import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { customers, systemStatus } from '../db/schema.js';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { syncCustomers, getCustomerStats } from '../lib/customer-sync.js';

export const customersRouter = Router();

customersRouter.use(requireAuth);

// GET /api/customers — list customers with pagination
customersRouter.get('/', (req, res) => {
  try {
    const { segment, sort, marketing, limit: limitParam, offset: offsetParam } = req.query as {
      segment?: string; sort?: string; marketing?: string; limit?: string; offset?: string;
    };

    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    const filters = [];
    if (segment && ['new', 'active', 'lapsed'].includes(segment)) {
      filters.push(eq(customers.segment, segment));
    }
    if (marketing === 'subscribed') {
      filters.push(isNull(customers.marketingOptOutAt));
    } else if (marketing === 'opted_out') {
      filters.push(isNotNull(customers.marketingOptOutAt));
    }

    const whereClause = filters.length > 1
      ? and(...filters)
      : filters[0];
    const query = whereClause
      ? db.select().from(customers).where(whereClause)
      : db.select().from(customers);

    const totalRow = whereClause
      ? db.select({ total: sql<number>`count(*)` }).from(customers).where(whereClause).get()
      : db.select({ total: sql<number>`count(*)` }).from(customers).get();
    const total = Number(totalRow?.total ?? 0);

    let results;
    if (sort === 'spent') {
      results = query.orderBy(desc(customers.totalSpent)).limit(limit).offset(offset).all();
    } else if (sort === 'orders') {
      results = query.orderBy(desc(customers.totalOrders)).limit(limit).offset(offset).all();
    } else if (sort === 'recent') {
      results = query.orderBy(desc(customers.lastPurchaseAt)).limit(limit).offset(offset).all();
    } else if (sort === 'registered') {
      results = query.orderBy(asc(customers.registeredAt)).limit(limit).offset(offset).all();
    } else {
      results = query.orderBy(desc(customers.updatedAt)).limit(limit).offset(offset).all();
    }

    const nextOffset = offset + results.length;
    res.json({
      customers: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: nextOffset < total,
        nextOffset: nextOffset < total ? nextOffset : null,
      },
    });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

// GET /api/customers/stats — customer analytics summary
customersRouter.get('/stats', (_req, res) => {
  try {
    const stats = getCustomerStats();
    res.json(stats);
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ error: 'Failed to get customer stats' });
  }
});

// POST /api/customers/sync — trigger customer data sync from tsumugi
customersRouter.post('/sync', async (_req, res) => {
  try {
    const result = await syncCustomers();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Customer sync error:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    res.status(500).json({ error: message });
  }
});

// GET /api/customers/sync-status — last auto-sync timestamp
customersRouter.get('/sync-status', (_req, res) => {
  try {
    const row = db
      .select()
      .from(systemStatus)
      .where(eq(systemStatus.key, 'last_customer_sync'))
      .get();
    res.json({ lastSync: row?.value ?? null });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// GET /api/customers/:id — get single customer detail
customersRouter.get('/:id', (req, res) => {
  try {
    const customer = db
      .select()
      .from(customers)
      .where(eq(customers.id, req.params.id))
      .get();

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// PATCH /api/customers/:id/marketing-opt-out — update subscription preference
customersRouter.patch('/:id/marketing-opt-out', (req, res) => {
  try {
    const { optOut } = req.body as { optOut?: unknown };
    if (typeof optOut !== 'boolean') {
      res.status(400).json({ error: 'optOut must be boolean' });
      return;
    }

    const existing = db
      .select()
      .from(customers)
      .where(eq(customers.id, req.params.id))
      .get();
    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const now = new Date().toISOString();
    db.update(customers)
      .set({
        marketingOptOutAt: optOut ? now : null,
        updatedAt: now,
      })
      .where(eq(customers.id, req.params.id))
      .run();

    const updated = db
      .select()
      .from(customers)
      .where(eq(customers.id, req.params.id))
      .get();

    res.json({ success: true, customer: updated });
  } catch (error) {
    console.error('Update customer marketing opt-out error:', error);
    res.status(500).json({ error: 'Failed to update customer preference' });
  }
});
