import { Router } from 'express';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { saveUserCart, restoreUserCart } from '../lib/cartAbandonment.js';
import { logger } from '../lib/logger.js';

export const cartRouter = Router();
cartRouter.use(csrfProtection({ methods: ['POST'] }));

// POST /api/cart/save
cartRouter.post('/save', requireAuth, (req, res) => {
  try {
    const user = getAuthUser(res);
    const { items } = req.body as { items?: { name: string; price: number; quantity: number }[] };

    if (!Array.isArray(items)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ITEMS', message: 'カート情報が不正です' },
      });
      return;
    }

    // Validate each item
    const validItems = items
      .filter(item =>
        typeof item.name === 'string' &&
        typeof item.price === 'number' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
      )
      .slice(0, 20)
      .map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

    saveUserCart(user.id, user.email, validItems);

    res.json({ success: true });
  } catch (error) {
    logger.error('Cart save error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'CART_SAVE_FAILED', message: 'カートの保存に失敗しました' },
    });
  }
});

// GET /api/cart/restore
cartRouter.get('/restore', requireAuth, (req, res) => {
  try {
    const user = getAuthUser(res);
    const items = restoreUserCart(user.id);

    res.json({
      success: true,
      items: items ?? [],
    });
  } catch (error) {
    logger.error('Cart restore error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'CART_RESTORE_FAILED', message: 'カートの復元に失敗しました' },
    });
  }
});
