import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const testLoginRouter = Router();

const isProduction = config.NODE_ENV === 'production';
const cookieSameSite: 'none' | 'lax' = isProduction && config.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';

/**
 * POST /api/test-login
 * Body: { key: string }
 * Sets fable_anon cookie to the first TEST_USER_ID
 */
testLoginRouter.post('/', (req, res) => {
  // 本番環境ではテストログインを完全に無効化
  if (isProduction) {
    res.status(404).json({ success: false, error: { message: 'Not found' } });
    return;
  }

  const testKey = config.TEST_LOGIN_KEY;
  const testUserIds = config.TEST_USER_IDS;

  if (!testKey || !testUserIds) {
    res.status(404).json({ success: false, error: { message: 'Not found' } });
    return;
  }

  const { key } = req.body ?? {};
  if (
    typeof key !== 'string' ||
    key.length !== testKey.length ||
    !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(testKey))
  ) {
    res.status(401).json({ success: false, error: { message: '認証に失敗しました' } });
    return;
  }

  const testUserId = testUserIds.split(',')[0]?.trim();
  if (!testUserId) {
    res.status(500).json({ success: false, error: { message: 'テストユーザー未設定' } });
    return;
  }

  res.cookie('fable_anon', testUserId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });

  logger.info('Test user login', { testUserId });
  res.json({ success: true, message: 'テストユーザーとしてログインしました' });
});
