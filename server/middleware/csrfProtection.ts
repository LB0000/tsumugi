import type { Request, Response, NextFunction } from 'express';
import {
  areTokensEqual,
  extractCsrfTokenFromCookie,
  extractCsrfTokenFromHeader,
  isAllowedOrigin,
  type HeaderMap,
} from '../lib/requestAuth.js';

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL;

export function csrfProtection(options?: {
  methods?: string[];
  skipPaths?: string[];
}): (req: Request, res: Response, next: NextFunction) => void {
  const methods = new Set(options?.methods ?? ['POST']);
  const skipPaths = new Set(options?.skipPaths ?? []);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!methods.has(req.method)) {
      next();
      return;
    }

    if (skipPaths.has(req.path)) {
      next();
      return;
    }

    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (!isAllowedOrigin({ originHeader, frontendUrl, isProduction })) {
      res.status(403).json({
        success: false,
        error: { code: 'ORIGIN_FORBIDDEN', message: '許可されていないオリジンです' },
      });
      return;
    }

    // In production with verified Origin, skip cookie token check.
    // The Origin header cannot be spoofed by JavaScript and provides
    // sufficient CSRF protection when it matches our FRONTEND_URL.
    // This avoids failures when browsers block third-party cookies
    // (e.g., frontend on Vercel and backend on Railway).
    if (isProduction && originHeader && frontendUrl && originHeader === frontendUrl) {
      next();
      return;
    }

    // In development (or when Origin is absent), fall back to double-submit cookie check
    const headers = req.headers as HeaderMap;
    const csrfCookie = extractCsrfTokenFromCookie(headers);
    const csrfHeader = extractCsrfTokenFromHeader(headers);
    if (!csrfCookie || !csrfHeader || !areTokensEqual(csrfCookie, csrfHeader)) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_TOKEN_INVALID', message: 'CSRFトークンが無効です' },
      });
      return;
    }

    next();
  };
}
