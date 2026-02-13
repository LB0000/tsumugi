import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { db } from '../db/index.js';
import { customers } from '../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { syncCustomers, getCustomerStats } from '../lib/customer-sync.js';

export const customersRouter = Router();

customersRouter.use(requireAuth);

// GET /api/customers — list customers with pagination
customersRouter.get('/', (req, res) => {
  try {
    const { segment, sort, limit: limitParam, offset: offsetParam } = req.query as {
      segment?: string; sort?: string; limit?: string; offset?: string;
    };

    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
    const offset = Math.max(Number(offsetParam) || 0, 0);

    let query = db.select().from(customers);

    if (segment && ['new', 'active', 'lapsed'].includes(segment)) {
      query = query.where(eq(customers.segment, segment)) as typeof query;
    }

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

    res.json({ customers: results, limit, offset });
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
