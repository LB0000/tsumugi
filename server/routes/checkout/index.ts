import { Router } from 'express';
import { csrfProtection } from '../../middleware/csrfProtection.js';
import { createRateLimiter } from '../../lib/rateLimit.js';
import { registerCreateOrder } from './createOrder.js';
import { registerProcessPayment } from './processPayment.js';
import { registerWebhook } from './webhook.js';
import { registerOrders } from './orders.js';

// Per-endpoint rate limiters (inner layer; global 30/min is outer layer in server/index.ts)
const createOrderLimiter = createRateLimiter({ windowMs: 60_000, max: 5, keyPrefix: 'checkout:create-order' });
const processPaymentLimiter = createRateLimiter({ windowMs: 60_000, max: 3, keyPrefix: 'checkout:process-payment' });

export const checkoutRouter = Router();
checkoutRouter.use(csrfProtection({ skipPaths: ['/webhook'] }));
checkoutRouter.use('/create-order', createOrderLimiter);
checkoutRouter.use('/process-payment', processPaymentLimiter);

// Register all checkout routes
registerCreateOrder(checkoutRouter);
registerProcessPayment(checkoutRouter);
registerWebhook(checkoutRouter);
registerOrders(checkoutRouter);

// Re-export helpers for tests and other modules
export {
  sanitizeReceiptUrl,
  buildOrderPaymentStatusUpdate,
  makeIdempotencyKey,
  normalizeShippingAddress,
  type ShippingAddressPayload,
} from './helpers.js';
