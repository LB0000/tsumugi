import 'dotenv/config';
import { initSentry, captureError, Sentry } from './lib/sentry.js';

initSentry();

import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { createRateLimiter } from './lib/rateLimit.js';
import { generateRouter } from './routes/generate.js';
import { stylesRouter } from './routes/styles.js';
import { pricingRouter } from './routes/pricing.js';
import { checkoutRouter } from './routes/checkout.js';
import { contactRouter } from './routes/contact.js';
import { supportRouter } from './routes/support.js';
import { authRouter } from './routes/auth.js';
import { galleryRouter } from './routes/gallery.js';
import { internalRouter } from './routes/internal.js';
import { reviewRouter } from './routes/reviews.js';
import { cartRouter } from './routes/cart.js';
import { creditsRouter } from './routes/credits.js';
import { testLoginRouter } from './routes/testLogin.js';
import { startCartAbandonmentChecker, stopCartAbandonmentChecker, cartAbandonmentHydrationReady } from './lib/cartAbandonment.js';
import { startScheduledEmailChecker, stopScheduledEmailChecker, scheduledEmailsHydrationReady } from './lib/scheduledEmails.js';
import { checkoutHydrationReady } from './lib/checkoutState.js';
import { styleAnalyticsHydrationReady } from './lib/styleAnalytics.js';
import { galleryHydrationReady } from './lib/galleryState.js';
import { creditsHydrationReady, stopCleanupInterval } from './lib/credits.js';

const app = express();
const PORT = config.PORT;
const isProduction = config.NODE_ENV === 'production';
const trustProxyEnv = process.env.TRUST_PROXY;

if (isProduction) {
  try {
    const url = new URL(config.FRONTEND_URL || '');
    if (url.protocol !== 'https:') {
      throw new Error('FRONTEND_URL must use https: in production');
    }
  } catch (e) {
    logger.error('Invalid FRONTEND_URL', { error: e instanceof Error ? e.message : String(e) });
    process.exit(1);
  }

  const requiredVars = [
    ['GEMINI_API_KEY', config.GEMINI_API_KEY],
    ['SQUARE_ACCESS_TOKEN', config.SQUARE_ACCESS_TOKEN],
    ['SQUARE_LOCATION_ID', config.SQUARE_LOCATION_ID],
    ['SESSION_SECRET', config.SESSION_SECRET],
  ] as const;

  const missing = requiredVars.filter(([, val]) => !val).map(([name]) => name);
  if (missing.length > 0) {
    // Console output for Railway logs (logger may not format objects correctly)
    console.error('❌ Missing required environment variables:', missing);
    console.error('📋 Environment variable status:');
    requiredVars.forEach(([name, val]) => {
      console.error(`  ${val ? '✓' : '✗'} ${name}`);
    });

    logger.error('Missing required environment variables', { missing });
    process.exit(1);
  }

  if (!config.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — email functionality will be disabled');
  }
}

if (trustProxyEnv && trustProxyEnv.trim().length > 0) {
  const normalized = trustProxyEnv.trim().toLowerCase();
  if (normalized === 'true') {
    app.set('trust proxy', 1);
  } else if (normalized === 'false') {
    app.set('trust proxy', false);
  } else {
    const parsedNumber = Number(normalized);
    if (Number.isInteger(parsedNumber) && parsedNumber >= 0) {
      app.set('trust proxy', parsedNumber);
    } else {
      app.set('trust proxy', normalized);
    }
  }
} else if (isProduction) {
  app.set('trust proxy', 1);
}

// CORS configuration
const corsOptions = {
  origin: isProduction
    ? config.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
  credentials: true,
};

interface RawBodyRequest extends Request {
  rawBody?: string;
}

// Middleware
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(requestIdMiddleware);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://accounts.google.com https://web.squarecdn.com https://sandbox.web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; img-src 'self' data: blob:; connect-src 'self' https://pax.google.com https://connect.squareup.com https://connect.squareupsandbox.com; font-src 'self' https://fonts.gstatic.com; frame-src https://accounts.google.com https://web.squarecdn.com https://sandbox.web.squarecdn.com; object-src 'none'; frame-ancestors 'none'");
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
app.use(express.json({
  limit: '10mb',  // Increased for base64 image uploads (Phase 6: Supabase Storage)
  verify: (req, _res, buf) => {
    // [S-10] Only store rawBody for webhook signature verification
    if (req.url?.includes('/webhook')) {
      (req as RawBodyRequest).rawBody = buf.toString('utf8');
    }
  },
}));

// Routes
app.use('/api/generate-image', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'generate-image' }), generateRouter);
app.use('/api/styles', stylesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/checkout', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'checkout' }), checkoutRouter);
app.use('/api/contact', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'contact' }), contactRouter);
app.use('/api/support', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'support' }), supportRouter);
app.use('/api/auth', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'auth' }), authRouter);
app.use('/api/gallery', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'gallery' }), galleryRouter);
app.use('/api/reviews', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'reviews' }), reviewRouter);
app.use('/api/cart', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'cart' }), cartRouter);
app.use('/api/credits', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'credits' }), creditsRouter);
app.use('/api/internal', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'internal' }), internalRouter);
app.use('/api/test-login', createRateLimiter({ windowMs: 60_000, max: 5, keyPrefix: 'test-login' }), testLoginRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — catches unhandled errors from route handlers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  captureError(err, { handler: 'globalErrorHandler', url: _req.url, method: _req.method });
  logger.error('Unhandled route error', { error: err.message, stack: err.stack });
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバー内部エラーが発生しました' } });
  }
});

const server = app.listen(PORT, async () => {
  await Promise.all([checkoutHydrationReady, styleAnalyticsHydrationReady, galleryHydrationReady, cartAbandonmentHydrationReady, scheduledEmailsHydrationReady, creditsHydrationReady]);
  logger.info(`Server running on http://localhost:${PORT}`);
  startCartAbandonmentChecker();
  startScheduledEmailChecker();
});

// [S-03] Graceful shutdown — flush pending persist queues before exit
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  stopCartAbandonmentChecker();
  stopScheduledEmailChecker();
  stopCleanupInterval();
  server.close(() => {
    // Allow pending async writes (persistQueue) a short window to flush
    setTimeout(() => process.exit(0), 500);
  });
  // Force exit after 5 seconds if server.close hangs
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  captureError(reason, { handler: 'unhandledRejection' });
  logger.error('Unhandled promise rejection', { error: reason instanceof Error ? reason.message : String(reason) });
});
