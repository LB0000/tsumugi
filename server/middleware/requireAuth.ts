import type { Request, Response, NextFunction } from 'express';
import { getUserBySessionToken, type AuthPublicUser } from '../lib/auth.js';
import { extractSessionTokenFromHeaders, type HeaderMap } from '../lib/requestAuth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractSessionTokenFromHeaders(req.headers as HeaderMap);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証情報がありません' },
    });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' },
    });
    return;
  }

  res.locals.user = user;
  next();
}

export function getAuthUser(res: Response): AuthPublicUser {
  return res.locals.user as AuthPublicUser;
}
