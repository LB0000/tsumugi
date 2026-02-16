import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { getAllPublicUsers, getUserCreatedAt } from '../lib/auth.js';
import { getAllOrdersGroupedByUserId } from '../lib/checkoutState.js';
import { getStyleAnalytics } from '../lib/styleAnalytics.js';

export const internalRouter = Router();

function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = process.env.INTERNAL_API_KEY;
  if (!key || key.length < 16) {
    res.status(503).json({ error: 'Internal API not configured' });
    return;
  }

  const provided = req.headers['x-internal-key'];
  if (typeof provided !== 'string') {
    res.status(401).json({ error: 'Invalid internal key' });
    return;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid internal key' });
    return;
  }

  next();
}

internalRouter.use(requireInternalKey);

// GET /api/internal/customers — returns all users with their order summaries
internalRouter.get('/customers', (req, res) => {
  const { limit: limitParam, offset: offsetParam } = req.query as { limit?: string; offset?: string };
  const limit = Math.min(Math.max(Number(limitParam) || 500, 1), 1000);
  const offset = Math.max(Number(offsetParam) || 0, 0);

  const users = getAllPublicUsers();
  const ordersByUserId = getAllOrdersGroupedByUserId();
  const total = users.length;
  const pagedUsers = users.slice(offset, offset + limit);

  const customers = pagedUsers.map((user) => {
    const orders = ordersByUserId.get(user.id) ?? [];
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const createdAt = getUserCreatedAt(user.id);

    const orderDates = completedOrders
      .map((o) => o.createdAt || o.updatedAt)
      .sort();

    return {
      tsumugiUserId: user.id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      registeredAt: createdAt,
      totalOrders: completedOrders.length,
      totalSpent,
      firstPurchaseAt: orderDates[0] ?? null,
      lastPurchaseAt: orderDates[orderDates.length - 1] ?? null,
    };
  });

  const nextOffset = offset + customers.length;
  res.json({
    customers,
    pagination: {
      total,
      limit,
      offset,
      hasMore: nextOffset < total,
      nextOffset: nextOffset < total ? nextOffset : null,
    },
  });
});

// GET /api/internal/style-analytics — returns style generation counts
internalRouter.get('/style-analytics', (_req, res) => {
  try {
    res.json(getStyleAnalytics());
  } catch {
    res.status(500).json({ error: 'Failed to get style analytics' });
  }
});
