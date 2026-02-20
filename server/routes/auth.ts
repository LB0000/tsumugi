import type { Response } from 'express';
import { Router } from 'express';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import {
  SESSION_TTL_MS,
  loginUser,
  logoutSession,
  registerUser,
  registerOrLoginWithGoogle,
  requestPasswordReset,
  resetPassword,
  updateUserProfile,
  changeUserPassword,
  createVerificationToken,
  verifyEmail,
  getUserEmailForVerification,
  getSavedAddresses,
  addSavedAddress,
  deleteSavedAddress,
} from '../lib/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../lib/email.js';
import {
  AUTH_CSRF_COOKIE_NAME,
  AUTH_SESSION_COOKIE_NAME,
  extractSessionTokenFromHeaders,
  type HeaderMap,
} from '../lib/requestAuth.js';
import { isValidEmail } from '../lib/validation.js';
import {
  validate,
  registerSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  changePasswordSchema,
} from '../lib/schemas.js';
import { requireAuth, getAuthUser } from '../middleware/requireAuth.js';
import { csrfProtection } from '../middleware/csrfProtection.js';
import { createRateLimiter } from '../lib/rateLimit.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export const authRouter = Router();
const isProduction = process.env.NODE_ENV === 'production';
const authCookieSameSite: 'none' | 'lax' = isProduction && config.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';
const authCookieSecure = isProduction;
const MAX_ADDRESS_LENGTH = {
  label: 40,
  lastName: 80,
  firstName: 80,
  email: 254,
  phone: 30,
  postalCode: 16,
  prefecture: 32,
  city: 120,
  addressLine: 200,
} as const;

function createCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: authCookieSecure,
    sameSite: authCookieSameSite,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

function setCsrfCookie(res: Response, token: string): void {
  res.cookie(AUTH_CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: authCookieSecure,
    sameSite: authCookieSameSite,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(AUTH_SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: authCookieSecure,
    sameSite: authCookieSameSite,
    path: '/',
  });
}

function clearCsrfCookie(res: Response): void {
  res.clearCookie(AUTH_CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: authCookieSecure,
    sameSite: authCookieSameSite,
    path: '/',
  });
}

authRouter.get('/csrf', (req, res) => {
  // Reuse existing CSRF cookie to avoid race conditions with concurrent requests
  const headers = req.headers as HeaderMap;
  const cookieHeader = typeof headers.cookie === 'string' ? headers.cookie : undefined;
  const existing = cookieHeader
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${AUTH_CSRF_COOKIE_NAME}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (existing && existing.length >= 32) {
    res.json({ success: true, csrfToken: existing });
    return;
  }

  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.json({ success: true, csrfToken });
});

authRouter.use(csrfProtection({ methods: ['POST', 'PUT', 'PATCH', 'DELETE'] }));

const forgotPasswordLimiter = createRateLimiter({ windowMs: 60_000, max: 3, keyPrefix: 'forgot-password' });
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 5, keyPrefix: 'auth-login' });
const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 3, keyPrefix: 'auth-register' });
const googleAuthLimiter = createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'auth-google' });
const resetPasswordLimiter = createRateLimiter({ windowMs: 60_000, max: 3, keyPrefix: 'auth-reset-password' });
const verifyEmailLimiter = createRateLimiter({ windowMs: 60_000, max: 5, keyPrefix: 'auth-verify-email' });

authRouter.post('/register', registerLimiter, async (req, res) => {
  try {
    const parsed = validate(registerSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: parsed.code || 'INVALID_REQUEST', message: parsed.error },
      });
      return;
    }

    const { name, email, password } = parsed.data;

    const result = await registerUser({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    // Send verification email (non-blocking)
    const verificationToken = createVerificationToken(result.user.id);
    void sendVerificationEmail(email.trim(), verificationToken).catch((e) => logger.error('Failed to send verification email', { error: (e as Error).message }));
    void sendWelcomeEmail(email.trim(), name.trim()).catch((e) => logger.error('Failed to send welcome email', { error: (e as Error).message }));

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'このメールアドレスは既に登録されています' },
      });
      return;
    }

    logger.error('Register error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'REGISTER_FAILED', message: '登録処理に失敗しました' },
    });
  }
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  try {
    const parsed = validate(loginSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'メールアドレスとパスワードを入力してください' },
      });
      return;
    }

    const { email, password } = parsed.data;

    const result = await loginUser({
      email: email.trim(),
      password,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' },
      });
      return;
    }

    if (error instanceof Error && error.message === 'USE_GOOGLE_LOGIN') {
      res.status(400).json({
        success: false,
        error: { code: 'USE_GOOGLE_LOGIN', message: 'このアカウントはGoogleログインで登録されています。Googleでログインしてください。' },
      });
      return;
    }

    logger.error('Login error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_FAILED', message: 'ログインに失敗しました' },
    });
  }
});

authRouter.post('/google', googleAuthLimiter, async (req, res) => {
  try {
    if (!googleOAuthClient) {
      res.status(500).json({
        success: false,
        error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Googleログインが設定されていません' },
      });
      return;
    }

    const parsed = validate(googleLoginSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Google認証情報が必要です' },
      });
      return;
    }

    const { credential } = parsed.data;

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Google認証トークンが無効です' },
      });
      return;
    }

    if (!payload.email_verified) {
      res.status(400).json({
        success: false,
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Googleアカウントのメールアドレスが未認証です' },
      });
      return;
    }

    const result = registerOrLoginWithGoogle({
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
    });

    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ACCOUNT_EXISTS') {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ACCOUNT_EXISTS', message: 'このメールアドレスは既にメール・パスワードで登録されています。メールアドレスとパスワードでログインしてください。' },
      });
      return;
    }

    logger.error('Google login error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(401).json({
      success: false,
      error: { code: 'GOOGLE_LOGIN_FAILED', message: 'Googleログインに失敗しました' },
    });
  }
});

authRouter.post('/forgot-password', forgotPasswordLimiter, (req, res) => {
  const parsed = validate(forgotPasswordSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: parsed.code || 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
    });
    return;
  }

  const normalizedEmail = parsed.data.email.trim();
  const resetToken = requestPasswordReset(normalizedEmail);
  setCsrfCookie(res, createCsrfToken());

  // Send password reset email if token was created
  if (resetToken) {
    void sendPasswordResetEmail(normalizedEmail, resetToken).catch((e) => logger.error('Failed to send password reset email', { error: (e as Error).message }));
  }

  res.json({
    success: true,
    message: 'メールアドレスが登録されている場合、パスワード再設定用の案内を送信しました',
  });
});

authRouter.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const parsed = validate(resetPasswordSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: parsed.code || 'INVALID_REQUEST', message: parsed.error },
      });
      return;
    }

    const result = await resetPassword({
      token: parsed.data.token.trim(),
      newPassword: parsed.data.password,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_RESET_TOKEN') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_TOKEN', message: 'リセットトークンが無効または期限切れです' },
      });
      return;
    }

    logger.error('Reset password error', { error: error instanceof Error ? error.message : String(error), requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'RESET_PASSWORD_FAILED', message: 'パスワード再設定に失敗しました' },
    });
  }
});

authRouter.get('/me', requireAuth, (_req, res) => {
  const user = getAuthUser(res);
  res.json({
    success: true,
    user,
  });
});

authRouter.post('/profile', requireAuth, async (_req, res) => {
  const user = getAuthUser(res);

  try {
    const parsed = validate(profileUpdateSchema, _req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: parsed.code || 'INVALID_NAME', message: 'お名前を正しく入力してください' },
      });
      return;
    }

    const updatedUser = await updateUserProfile(user.id, { name: parsed.data.name.trim() });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error('Update profile error', { error: error instanceof Error ? error.message : String(error), requestId: _req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'プロフィールの更新に失敗しました' },
    });
  }
});

authRouter.post('/change-password', requireAuth, async (_req, res) => {
  const user = getAuthUser(res);

  try {
    const parsed = validate(changePasswordSchema, _req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: parsed.code || 'INVALID_REQUEST', message: parsed.error },
      });
      return;
    }

    const result = await changeUserPassword(user.id, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({ success: true, sessionToken: result.token });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CURRENT_PASSWORD') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: '現在のパスワードが正しくありません' },
      });
      return;
    }

    if (error instanceof Error && error.message === 'GOOGLE_ONLY_ACCOUNT') {
      res.status(400).json({
        success: false,
        error: { code: 'GOOGLE_ONLY_ACCOUNT', message: 'Googleアカウントではパスワード変更はできません' },
      });
      return;
    }

    logger.error('Change password error', { error: error instanceof Error ? error.message : String(error), requestId: _req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'CHANGE_PASSWORD_FAILED', message: 'パスワード変更に失敗しました' },
    });
  }
});

authRouter.post('/verify-email', verifyEmailLimiter, (req, res) => {
  const { token } = req.body as { token?: string };
  const normalizedToken = typeof token === 'string' ? token.trim() : '';

  if (!normalizedToken) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: '認証トークンが必要です' },
    });
    return;
  }

  const user = verifyEmail(normalizedToken);
  if (!user) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_VERIFICATION_TOKEN', message: '認証トークンが無効または期限切れです' },
    });
    return;
  }

  res.json({ success: true, user });
});

authRouter.post('/resend-verification', requireAuth, (_req, res) => {
  const user = getAuthUser(res);

  if (user.emailVerified) {
    res.json({ success: true, message: 'メールアドレスは既に認証済みです' });
    return;
  }

  const email = getUserEmailForVerification(user.id);
  if (!email) {
    res.status(500).json({
      success: false,
      error: { code: 'EMAIL_NOT_FOUND', message: 'メールアドレスが見つかりません' },
    });
    return;
  }

  const verificationToken = createVerificationToken(user.id);
  void sendVerificationEmail(email, verificationToken).catch((e) => logger.error('Failed to send verification email', { error: (e as Error).message }));

  res.json({ success: true, message: '認証メールを再送信しました' });
});

// GET /api/auth/addresses
authRouter.get('/addresses', requireAuth, (_req, res) => {
  const user = getAuthUser(res);
  const addresses = getSavedAddresses(user.id);
  res.json({ success: true, addresses });
});

// POST /api/auth/addresses
authRouter.post('/addresses', requireAuth, (_req, res) => {
  const user = getAuthUser(res);

  try {
    const body = _req.body as Record<string, unknown>;
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const prefecture = typeof body.prefecture === 'string' ? body.prefecture.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const addressLine = typeof body.addressLine === 'string' ? body.addressLine.trim() : '';
    const isDefault = body.isDefault === true;

    if (!label || !lastName || !firstName || !email || !phone || !postalCode || !prefecture || !city || !addressLine) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: '配送先情報が不足しています' },
      });
      return;
    }

    if (
      label.length > MAX_ADDRESS_LENGTH.label ||
      lastName.length > MAX_ADDRESS_LENGTH.lastName ||
      firstName.length > MAX_ADDRESS_LENGTH.firstName ||
      email.length > MAX_ADDRESS_LENGTH.email ||
      phone.length > MAX_ADDRESS_LENGTH.phone ||
      postalCode.length > MAX_ADDRESS_LENGTH.postalCode ||
      prefecture.length > MAX_ADDRESS_LENGTH.prefecture ||
      city.length > MAX_ADDRESS_LENGTH.city ||
      addressLine.length > MAX_ADDRESS_LENGTH.addressLine
    ) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: '配送先情報の文字数が上限を超えています' },
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
      });
      return;
    }

    const normalizedPhone = phone.replace(/-/g, '');
    if (!/^0\d{9,11}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PHONE', message: '電話番号の形式が正しくありません' },
      });
      return;
    }

    const normalizedPostalCode = postalCode.replace(/-/g, '');
    if (!/^\d{7}$/.test(normalizedPostalCode)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_POSTAL_CODE', message: '郵便番号の形式が正しくありません' },
      });
      return;
    }

    const address = addSavedAddress(user.id, {
      label, lastName, firstName, email, phone,
      postalCode, prefecture, city, addressLine, isDefault,
    });
    res.json({ success: true, address });
  } catch (error) {
    if (error instanceof Error && error.message === 'MAX_ADDRESSES_REACHED') {
      res.status(400).json({
        success: false,
        error: { code: 'MAX_ADDRESSES_REACHED', message: '保存できる配送先は最大3件です' },
      });
      return;
    }

    logger.error('Add address error', { error: error instanceof Error ? error.message : String(error), requestId: _req.requestId });
    res.status(500).json({
      success: false,
      error: { code: 'ADDRESS_SAVE_FAILED', message: '配送先の保存に失敗しました' },
    });
  }
});

// DELETE /api/auth/addresses/:id
authRouter.delete('/addresses/:id', requireAuth, (_req, res) => {
  const user = getAuthUser(res);

  const addressId = typeof _req.params.id === 'string' ? _req.params.id.trim() : '';
  if (!addressId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ADDRESS_ID', message: '配送先IDが必要です' },
    });
    return;
  }

  const deleted = deleteSavedAddress(user.id, addressId);
  if (!deleted) {
    res.status(404).json({
      success: false,
      error: { code: 'ADDRESS_NOT_FOUND', message: '配送先が見つかりません' },
    });
    return;
  }

  res.json({ success: true });
});

authRouter.post('/logout', (req, res) => {
  const token = extractSessionTokenFromHeaders(req.headers as HeaderMap);
  if (token) {
    logoutSession(token);
  }
  clearSessionCookie(res);
  clearCsrfCookie(res);
  res.json({ success: true });
});
