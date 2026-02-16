import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;
const buckets = new Map<string, RateLimitBucket>();

function getClientIp(req: Request): string {
  // req.ip は trust proxy 設定に基づいて X-Forwarded-For を考慮する
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    if (buckets.size >= MAX_ENTRIES * 0.9) {
      logger.warn('RateLimit bucket count at 90% capacity', { size: buckets.size });
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      if (!buckets.has(key) && buckets.size >= MAX_ENTRIES) {
        pruneExpiredBuckets(now);
        if (buckets.size >= MAX_ENTRIES) {
          let oldestKey: string | undefined;
          let oldestResetAt = Infinity;
          for (const [k, b] of buckets.entries()) {
            if (b.resetAt < oldestResetAt) {
              oldestResetAt = b.resetAt;
              oldestKey = k;
            }
          }
          if (oldestKey) buckets.delete(oldestKey);
        }
      }
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      next();
      return;
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエストが多すぎます。しばらく時間をおいて再試行してください。',
        },
      });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)));
    next();
  };
}

setInterval(() => {
  pruneExpiredBuckets(Date.now());
}, 60_000).unref();
