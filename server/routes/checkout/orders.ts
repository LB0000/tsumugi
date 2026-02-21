import type { Router } from 'express';
import { logger } from '../../lib/logger.js';
import { getOrderPaymentStatus, getOrdersByUserId, updateOrderPaymentStatus } from '../../lib/checkoutState.js';
import { validateCoupon } from '../../lib/coupon.js';
import { requireAuth, getAuthUser } from '../../middleware/requireAuth.js';
import { sanitizePaymentStatusReceipt, ORDER_LINK_WINDOW_MS } from './helpers.js';

export function registerOrders(router: Router) {
  // GET /api/checkout/payment-status/:orderId
  router.get('/payment-status/:orderId', requireAuth, (req, res) => {
    const user = getAuthUser(res);
    const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
    const paymentIdQuery = typeof req.query.paymentId === 'string' ? req.query.paymentId.trim() : '';
    if (!orderId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ORDER_ID', message: '注文IDが必要です' } });
      return;
    }
    if (!paymentIdQuery) {
      res.status(400).json({ success: false, error: { code: 'INVALID_PAYMENT_ID', message: '決済IDが必要です' } });
      return;
    }

    const paymentStatus = getOrderPaymentStatus(orderId);
    if (!paymentStatus || paymentStatus.paymentId !== paymentIdQuery || paymentStatus.userId !== user.id) {
      res.status(404).json({ success: false, error: { code: 'PAYMENT_STATUS_NOT_FOUND', message: '決済ステータスが見つかりません' } });
      return;
    }

    res.json({ success: true, paymentStatus: sanitizePaymentStatusReceipt(paymentStatus) });
  });

  // GET /api/checkout/orders
  router.get('/orders', requireAuth, (req, res) => {
    const user = getAuthUser(res);
    const orders = getOrdersByUserId(user.id);
    res.json({ success: true, orders: orders.map(sanitizePaymentStatusReceipt) });
  });

  // GET /api/checkout/orders/:orderId
  router.get('/orders/:orderId', requireAuth, (req, res) => {
    const user = getAuthUser(res);
    const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
    if (!orderId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ORDER_ID', message: '注文IDが必要です' } });
      return;
    }

    const orderStatus = getOrderPaymentStatus(orderId);
    if (!orderStatus || orderStatus.userId !== user.id) {
      res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: '注文が見つかりません' } });
      return;
    }

    res.json({ success: true, order: sanitizePaymentStatusReceipt(orderStatus) });
  });

  // POST /api/checkout/validate-coupon
  router.post('/validate-coupon', requireAuth, async (req, res) => {
    try {
      const { code } = req.body as { code?: string };
      if (!code?.trim()) {
        res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'クーポンコードを入力してください' } });
        return;
      }

      const result = await validateCoupon(code);

      if (!result.valid) {
        res.json({ success: false, error: { code: 'INVALID_COUPON', message: result.error || '無効なクーポンです' } });
        return;
      }

      res.json({
        success: true,
        coupon: {
          code: result.code,
          discountType: result.discountType,
          discountValue: result.discountValue,
        },
      });
    } catch (error) {
      logger.error('Validate coupon error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
      res.status(500).json({ success: false, error: { code: 'COUPON_ERROR', message: 'クーポンの検証に失敗しました' } });
    }
  });

  // POST /api/checkout/link-order — ゲスト注文を新規アカウントに紐付け
  router.post('/link-order', requireAuth, (req, res) => {
    const user = getAuthUser(res);
    const { orderId } = req.body as { orderId?: string };

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ success: false, error: { code: 'INVALID_ORDER_ID', message: '注文番号が必要です' } });
      return;
    }

    const orderStatus = getOrderPaymentStatus(orderId);
    if (!orderStatus) {
      res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: '注文が見つかりません' } });
      return;
    }

    // セキュリティ: メールアドレス一致チェック
    if (orderStatus.shippingAddress?.email?.toLowerCase() !== user.email.toLowerCase()) {
      res.status(403).json({ success: false, error: { code: 'EMAIL_MISMATCH', message: 'この注文を紐付ける権限がありません' } });
      return;
    }

    // セキュリティ: 注文作成から72時間以内のみ
    const orderCreatedAt = orderStatus.createdAt ? new Date(orderStatus.createdAt).getTime() : 0;
    if (Date.now() - orderCreatedAt > ORDER_LINK_WINDOW_MS) {
      res.status(403).json({ success: false, error: { code: 'LINK_WINDOW_EXPIRED', message: '注文の紐付け期限が過ぎています。サポートにお問い合わせください。' } });
      return;
    }

    // 既に紐付け済みチェック
    if (orderStatus.userId) {
      if (orderStatus.userId === user.id) {
        res.json({ success: true });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'ALREADY_LINKED', message: 'この注文は既にアカウントに紐付けられています' } });
      return;
    }

    updateOrderPaymentStatus({ ...orderStatus, userId: user.id });
    logger.info('Guest order linked to account', { orderId, userId: user.id, requestId: req.requestId });
    res.json({ success: true });
  });
}
