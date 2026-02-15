import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { Request } from 'express';
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

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const trustProxyEnv = process.env.TRUST_PROXY;

if (isProduction && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required in production');
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
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
  credentials: true,
};

interface RawBodyRequest extends Request {
  rawBody?: string;
}

// Middleware
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'");
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
app.use(express.json({
  limit: '20mb',
  verify: (req, _res, buf) => {
    (req as RawBodyRequest).rawBody = buf.toString('utf8');
  },
}));

// Routes
app.use('/api/generate-image', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'generate-image' }), generateRouter);
app.use('/api/styles', stylesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/checkout', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'checkout' }), checkoutRouter);
app.use('/api/contact', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'contact' }), contactRouter);
app.use('/api/support', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'support' }), supportRouter);
app.use('/api/auth', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'auth' }), authRouter);
app.use('/api/gallery', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'gallery' }), galleryRouter);
app.use('/api/internal', internalRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
