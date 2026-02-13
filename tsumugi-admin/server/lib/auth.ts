import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const sessions = new Map<string, { expiresAt: number }>();

// Periodic cleanup of expired sessions (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 10 * 60_000).unref();

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 12) {
    throw new Error('ADMIN_PASSWORD must be set and at least 12 characters');
  }
  return pw;
}

export function login(password: string): string | null {
  const expected = getAdminPassword();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  const token = createHash('sha256')
    .update(randomBytes(32))
    .digest('hex');
  sessions.set(token, { expiresAt: Date.now() + SESSION_DURATION_MS });
  return token;
}

export function logout(token: string): void {
  sessions.delete(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    res.status(401).json({ error: 'Session expired' });
    return;
  }
  next();
}
