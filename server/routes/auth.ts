import type { Request, Response } from 'express';
import { Router } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  SESSION_TTL_MS,
  getUserBySessionToken,
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
} from '../lib/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export const authRouter = Router();
const AUTH_SESSION_COOKIE_NAME = 'fable_session';
const AUTH_CSRF_COOKIE_NAME = 'fable_csrf';
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL;
const authCookieSameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax';
const authCookieSecure = isProduction;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const entry of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = entry.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    const name = rawName.trim();
    const value = rawValue.join('=').trim();
    if (!name || !value) continue;

    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }

  return cookies;
}

function extractSessionToken(req: Request): string | null {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const bearerToken = extractBearerToken(authorization);
  if (bearerToken) {
    return bearerToken;
  }

  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined;
  const cookies = parseCookies(cookieHeader);
  return cookies.get(AUTH_SESSION_COOKIE_NAME) ?? null;
}

function extractCsrfTokenFromCookie(req: Request): string | null {
  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined;
  const cookies = parseCookies(cookieHeader);
  return cookies.get(AUTH_CSRF_COOKIE_NAME) ?? null;
}

function extractCsrfTokenFromHeader(req: Request): string | null {
  const header = req.headers['x-csrf-token'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  if (Array.isArray(header) && typeof header[0] === 'string' && header[0].trim().length > 0) {
    return header[0].trim();
  }
  return null;
}

function createCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

function isSameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
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

function isAllowedOrigin(originHeader: string | undefined): boolean {
  if (!isProduction || !frontendUrl) return true;
  if (!originHeader) return false;
  return originHeader === frontendUrl;
}

authRouter.get('/csrf', (_req, res) => {
  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.json({
    success: true,
    csrfToken,
  });
});

authRouter.use((req, res, next) => {
  if (req.method !== 'POST') {
    next();
    return;
  }

  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (!isAllowedOrigin(originHeader)) {
    res.status(403).json({
      success: false,
      error: { code: 'ORIGIN_FORBIDDEN', message: '許可されていないオリジンです' },
    });
    return;
  }

  const csrfTokenFromCookie = extractCsrfTokenFromCookie(req);
  const csrfTokenFromHeader = extractCsrfTokenFromHeader(req);
  if (!csrfTokenFromCookie || !csrfTokenFromHeader || !isSameToken(csrfTokenFromCookie, csrfTokenFromHeader)) {
    res.status(403).json({
      success: false,
      error: { code: 'CSRF_TOKEN_INVALID', message: 'CSRFトークンが無効です' },
    });
    return;
  }

  next();
});

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (normalizedName.length < 1 || normalizedName.length > 80) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'お名前を正しく入力してください' },
      });
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
      });
      return;
    }

    if (normalizedPassword.length < 8 || normalizedPassword.length > 128) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'パスワードは8文字以上128文字以内で入力してください' },
      });
      return;
    }

    const result = await registerUser({
      name: normalizedName,
      email: normalizedEmail,
      password: normalizedPassword,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    // Send verification email (non-blocking)
    const verificationToken = createVerificationToken(result.user.id);
    void sendVerificationEmail(normalizedEmail, verificationToken);

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'このメールアドレスは既に登録されています' },
      });
      return;
    }

    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REGISTER_FAILED', message: '登録処理に失敗しました' },
    });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!isValidEmail(normalizedEmail) || normalizedPassword.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'メールアドレスとパスワードを入力してください' },
      });
      return;
    }

    const result = await loginUser({
      email: normalizedEmail,
      password: normalizedPassword,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({
      success: true,
      user: result.user,
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

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_FAILED', message: 'ログインに失敗しました' },
    });
  }
});

authRouter.post('/google', async (req, res) => {
  try {
    if (!googleOAuthClient) {
      res.status(500).json({
        success: false,
        error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Googleログインが設定されていません' },
      });
      return;
    }

    const { credential } = req.body as { credential?: string };
    if (!credential || typeof credential !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Google認証情報が必要です' },
      });
      return;
    }

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
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ACCOUNT_EXISTS') {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ACCOUNT_EXISTS', message: 'このメールアドレスは既にメール・パスワードで登録されています。メールアドレスとパスワードでログインしてください。' },
      });
      return;
    }

    console.error('Google login error:', error);
    res.status(401).json({
      success: false,
      error: { code: 'GOOGLE_LOGIN_FAILED', message: 'Googleログインに失敗しました' },
    });
  }
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
    });
    return;
  }

  const resetToken = requestPasswordReset(normalizedEmail);
  setCsrfCookie(res, createCsrfToken());

  // Send password reset email if token was created
  if (resetToken) {
    void sendPasswordResetEmail(normalizedEmail, resetToken);
  }

  res.json({
    success: true,
    message: 'メールアドレスが登録されている場合、パスワード再設定用の案内を送信しました',
  });
});

authRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body as {
      token?: string;
      newPassword?: string;
    };

    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedPassword = typeof newPassword === 'string' ? newPassword : '';

    if (normalizedToken.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'リセットトークンが必要です' },
      });
      return;
    }

    if (normalizedPassword.length < 8 || normalizedPassword.length > 128) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'パスワードは8文字以上128文字以内で入力してください' },
      });
      return;
    }

    const result = await resetPassword({
      token: normalizedToken,
      newPassword: normalizedPassword,
    });
    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_RESET_TOKEN') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_TOKEN', message: 'リセットトークンが無効または期限切れです' },
      });
      return;
    }

    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'RESET_PASSWORD_FAILED', message: 'パスワード再設定に失敗しました' },
    });
  }
});

authRouter.get('/me', (req, res) => {
  const token = extractSessionToken(req);
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

  res.json({
    success: true,
    user,
  });
});

authRouter.post('/profile', async (req, res) => {
  const token = extractSessionToken(req);
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

  try {
    const { name } = req.body as { name?: string };
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (normalizedName.length < 1 || normalizedName.length > 80) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'お名前を正しく入力してください' },
      });
      return;
    }

    const updatedUser = await updateUserProfile(user.id, { name: normalizedName });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'プロフィールの更新に失敗しました' },
    });
  }
});

authRouter.post('/change-password', async (req, res) => {
  const token = extractSessionToken(req);
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

  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    const normalizedCurrent = typeof currentPassword === 'string' ? currentPassword : '';
    const normalizedNew = typeof newPassword === 'string' ? newPassword : '';

    if (normalizedCurrent.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '現在のパスワードを入力してください' },
      });
      return;
    }

    if (normalizedNew.length < 8 || normalizedNew.length > 128) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: '新しいパスワードは8文字以上128文字以内で入力してください' },
      });
      return;
    }

    const result = await changeUserPassword(user.id, {
      currentPassword: normalizedCurrent,
      newPassword: normalizedNew,
    });

    setSessionCookie(res, result.token);
    setCsrfCookie(res, createCsrfToken());

    res.json({ success: true });
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

    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CHANGE_PASSWORD_FAILED', message: 'パスワード変更に失敗しました' },
    });
  }
});

authRouter.post('/verify-email', (req, res) => {
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

authRouter.post('/resend-verification', (req, res) => {
  const sessionToken = extractSessionToken(req);
  if (!sessionToken) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証情報がありません' },
    });
    return;
  }

  const user = getUserBySessionToken(sessionToken);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'セッションが無効です' },
    });
    return;
  }

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
  void sendVerificationEmail(email, verificationToken);

  res.json({ success: true, message: '認証メールを再送信しました' });
});

authRouter.post('/logout', (req, res) => {
  const token = extractSessionToken(req);
  if (token) {
    logoutSession(token);
  }
  clearSessionCookie(res);
  clearCsrfCookie(res);
  res.json({ success: true });
});
