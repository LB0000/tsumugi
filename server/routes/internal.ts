import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getAllPublicUsers, getUserCreatedAt } from '../lib/auth.js';
import { getOrdersByUserId } from '../lib/checkoutState.js';

export const internalRouter = Router();

function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = process.env.INTERNAL_API_KEY;
  if (!key || key.length < 16) {
    res.status(503).json({ error: 'Internal API not configured' });
    return;
  }

  const provided = req.headers['x-internal-key'];
  if (typeof provided !== 'string' || provided !== key) {
    res.status(401).json({ error: 'Invalid internal key' });
    return;
  }

  next();
}

internalRouter.use(requireInternalKey);

// GET /api/internal/customers — returns all users with their order summaries
internalRouter.get('/customers', (_req, res) => {
  const users = getAllPublicUsers();

  const customers = users.map((user) => {
    const orders = getOrdersByUserId(user.id);
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

  res.json({ customers });
});
