import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRateLimiter } from './lib/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { contentRouter } from './routes/content.js';
import { customersRouter } from './routes/customers.js';
import { campaignsRouter } from './routes/campaigns.js';

const app = express();
const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required in production');
}

const corsOptions = {
  origin: isProduction
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', createRateLimiter({ windowMs: 15 * 60_000, max: 5, keyPrefix: 'auth' }), authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/content', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'content-generate' }), contentRouter);
app.use('/api/customers', customersRouter);
app.use('/api/campaigns', campaignsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Admin server running on http://localhost:${PORT}`);
});
