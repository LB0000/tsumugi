import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRateLimiter } from './lib/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { contentRouter } from './routes/content.js';
import { customersRouter } from './routes/customers.js';
import { campaignsRouter } from './routes/campaigns.js';
import { styleAnalyticsRouter } from './routes/style-analytics.js';

const app = express();
const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL;

if (isProduction && !frontendUrl) {
  throw new Error('FRONTEND_URL is required in production');
}

if (isProduction) {
  try {
    const url = new URL(frontendUrl || '');
    if (url.protocol !== 'https:') {
      throw new Error('FRONTEND_URL must use https: in production');
    }
  } catch (error) {
    throw new Error(
      `Invalid FRONTEND_URL: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Admin server running on http://localhost:${PORT}`);
});
