import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createRateLimiter } from './lib/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { contentRouter } from './routes/content.js';
import { customersRouter } from './routes/customers.js';
import { campaignsRouter } from './routes/campaigns.js';
import { styleAnalyticsRouter } from './routes/style-analytics.js';
import { strategyRouter } from './routes/strategy.js';
import { cacRouter } from './routes/cac.js';
import { funnelRouter } from './routes/funnel.js';
import { reviewsRouter } from './routes/reviews.js';
import { actionsRouter } from './routes/actions.js';
import { automationsRouter } from './routes/automations.js';
import { retentionRouter } from './routes/retention.js';
import { backupsRouter } from './routes/backups.js';
import { alertsRouter } from './routes/alerts.js';
import { funnelSyncRouter } from './routes/funnel-sync.js';
import { apiMonitorRouter } from './routes/api-monitor.js';
import { startAllJobs, stopAllJobs } from './jobs/index.js';

const app = express();
const { PORT, NODE_ENV, FRONTEND_URL: frontendUrl } = config;
const isProduction = NODE_ENV === 'production';

const corsOptions = {
  origin: isProduction
    ? frontendUrl
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Routes
app.use('/api/auth', createRateLimiter({ windowMs: 15 * 60_000, max: 5, keyPrefix: 'auth' }), authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/content', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'content-generate' }), contentRouter);
app.use('/api/customers', customersRouter);
app.use('/api/campaigns', createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'campaigns' }), campaignsRouter);
app.use('/api/style-analytics', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'style-analytics' }), styleAnalyticsRouter);
app.use('/api/strategy', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'strategy' }), strategyRouter);
app.use('/api/cac', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'cac' }), cacRouter);
app.use('/api/funnel', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'funnel' }), funnelRouter);
app.use('/api/reviews', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'reviews' }), reviewsRouter);
app.use('/api/actions', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'actions' }), actionsRouter);
app.use('/api/automations', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'automations' }), automationsRouter);
app.use('/api/retention', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'retention' }), retentionRouter);
app.use('/api/backups', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'backups' }), backupsRouter);
app.use('/api/alerts', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'alerts' }), alertsRouter);
app.use('/api/funnel-sync', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'funnel-sync' }), funnelSyncRouter);
app.use('/api/api-monitor', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'api-monitor' }), apiMonitorRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin server running on http://0.0.0.0:${PORT}`);
  if (!isProduction) {
    console.log(`Database: ${config.DATABASE_URL}`);
  }
  console.log(`Environment: ${NODE_ENV}`);
  startAllJobs();
});

process.on('SIGTERM', () => {
  stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  stopAllJobs();
  process.exit(0);
});
