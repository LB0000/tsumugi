import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { Request, Response, Router } from 'express';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../../lib/auth.js', () => ({
  SESSION_TTL_MS: 604800000,
  loginUser: vi.fn(),
  logoutSession: vi.fn(),
  registerUser: vi.fn(),
  registerOrLoginWithGoogle: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  updateUserProfile: vi.fn(),
  changeUserPassword: vi.fn(),
  createVerificationToken: vi.fn(),
  verifyEmail: vi.fn(),
  getUserEmailForVerification: vi.fn(),
  getUserBySessionToken: vi.fn(),
  getSavedAddresses: vi.fn(),
  addSavedAddress: vi.fn(),
  deleteSavedAddress: vi.fn(),
}));

vi.mock('../../lib/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../config.js', () => ({
  config: { FRONTEND_URL: 'https://test.com', COOKIE_SAME_SITE: 'lax' },
}));

vi.mock('../../lib/requestAuth.js', () => ({
  AUTH_SESSION_COOKIE_NAME: 'fable_session',
  AUTH_CSRF_COOKIE_NAME: 'fable_csrf',
  extractSessionTokenFromHeaders: vi.fn(),
}));

vi.mock('../../lib/validation.js', () => ({
  isValidEmail: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/schemas.js', () => ({
  validate: vi.fn(),
  registerSchema: {},
  loginSchema: {},
  googleLoginSchema: {},
  forgotPasswordSchema: {},
  resetPasswordSchema: {},
  profileUpdateSchema: {},
  changePasswordSchema: {},
}));

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuthUser: vi.fn(),
}));

vi.mock('../../middleware/csrfProtection.js', () => ({
  csrfProtection: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../lib/rateLimit.js', () => ({
  createRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(function () {
    return { verifyIdToken: vi.fn() };
  }),
}));

import { authRouter } from '../../routes/auth.js';
import { registerUser, loginUser, logoutSession, requestPasswordReset, resetPassword, updateUserProfile, changeUserPassword, verifyEmail, getUserEmailForVerification, createVerificationToken, getSavedAddresses, addSavedAddress, deleteSavedAddress } from '../../lib/auth.js';
import { extractSessionTokenFromHeaders } from '../../lib/requestAuth.js';
import { getAuthUser } from '../../middleware/requireAuth.js';
import { validate } from '../../lib/schemas.js';
import { isValidEmail } from '../../lib/validation.js';

// ── Helpers ────────────────────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): Partial<Request> {
  return {
    body: overrides.body ?? {},
    headers: { cookie: '', ...(overrides.headers as Record<string, string> || {}) } as Record<string, string>,
    params: overrides.params as Record<string, string> ?? {},
    ip: '127.0.0.1',
    requestId: 'test-req-id',
    method: 'POST',
    ...overrides,
  } as Partial<Request>;
}

function mockRes() {
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const cookieFn = vi.fn();
  const clearCookieFn = vi.fn();

  return {
    res: {
      json: jsonFn,
      status: statusFn,
      cookie: cookieFn,
      clearCookie: clearCookieFn,
      locals: {},
    } as unknown as Response,
    statusFn,
    jsonFn,
    cookieFn,
    clearCookieFn,
  };
}

// ── Extract handlers from router stack ─────────────────

type RouteHandler = (req: Partial<Request>, res: Partial<Response>) => Promise<void> | void;

function findHandler(method: string, path: string): RouteHandler {
  const stack = (authRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: RouteHandler }> }; handle?: RouteHandler; name?: string }> }).stack;
  const routeLayer = stack.find(
    (layer) => layer.route?.path === path && layer.route?.methods?.[method],
  );

  if (!routeLayer?.route) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route on authRouter`);
  }

  // Last handler in the stack is the actual route handler (after middleware)
  const handlers = routeLayer.route.stack;
  return handlers[handlers.length - 1].handle;
}

let registerHandler: RouteHandler;
let loginHandler: RouteHandler;
let logoutHandler: RouteHandler;
let forgotPasswordHandler: RouteHandler;
let resetPasswordHandler: RouteHandler;
let meHandler: RouteHandler;
let profileHandler: RouteHandler;
let changePasswordHandler: RouteHandler;
let verifyEmailHandler: RouteHandler;
let resendVerificationHandler: RouteHandler;
let getAddressesHandler: RouteHandler;
let postAddressesHandler: RouteHandler;
let deleteAddressHandler: RouteHandler;
let csrfHandler: RouteHandler;

beforeAll(() => {
  registerHandler = findHandler('post', '/register');
  loginHandler = findHandler('post', '/login');
  logoutHandler = findHandler('post', '/logout');
  forgotPasswordHandler = findHandler('post', '/forgot-password');
  resetPasswordHandler = findHandler('post', '/reset-password');
  meHandler = findHandler('get', '/me');
  profileHandler = findHandler('post', '/profile');
  changePasswordHandler = findHandler('post', '/change-password');
  verifyEmailHandler = findHandler('post', '/verify-email');
  resendVerificationHandler = findHandler('post', '/resend-verification');
  getAddressesHandler = findHandler('get', '/addresses');
  postAddressesHandler = findHandler('post', '/addresses');
  deleteAddressHandler = findHandler('delete', '/addresses/:id');
  csrfHandler = findHandler('get', '/csrf');
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isValidEmail).mockReturnValue(true);
});

// ── Tests ──────────────────────────────────────────────

describe('auth routes', () => {
  // ── POST /register ────────────────────────────────────
  describe('POST /register', () => {
    it('returns 400 when validation fails', async () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid input', code: 'INVALID_EMAIL' });

      const { res, statusFn, jsonFn } = mockRes();
      await registerHandler(mockReq({ body: {} }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_EMAIL' }),
      }));
    });

    it('returns success with user and sessionToken on valid registration', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { name: 'Test User', email: 'test@example.com', password: 'password123' },
      });
      vi.mocked(registerUser).mockResolvedValue({
        user: { id: 'usr_1', name: 'Test User', email: 'test@example.com', authProvider: 'email', emailVerified: false },
        token: 'session-token-123',
      });
      vi.mocked(createVerificationToken).mockReturnValue('verification-token-123');

      const { res, jsonFn, cookieFn } = mockRes();
      await registerHandler(mockReq({ body: { name: 'Test User', email: 'test@example.com', password: 'password123' } }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        user: expect.objectContaining({ id: 'usr_1' }),
        sessionToken: 'session-token-123',
      }));
      // Should set session cookie and CSRF cookie
      expect(cookieFn).toHaveBeenCalledTimes(2);
    });

    it('returns 409 when email already exists', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { name: 'Test', email: 'dup@example.com', password: 'password123' },
      });
      vi.mocked(registerUser).mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'));

      const { res, statusFn, jsonFn } = mockRes();
      await registerHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(409);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'EMAIL_ALREADY_EXISTS' }),
      }));
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { name: 'Test', email: 'test@example.com', password: 'password123' },
      });
      vi.mocked(registerUser).mockRejectedValue(new Error('DB_FAILURE'));

      const { res, statusFn, jsonFn } = mockRes();
      await registerHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'REGISTER_FAILED' }),
      }));
    });
  });

  // ── POST /login ────────────────────────────────────────
  describe('POST /login', () => {
    it('returns 400 when validation fails', async () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid' });

      const { res, statusFn, jsonFn } = mockRes();
      await loginHandler(mockReq({ body: {} }), res);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }));
    });

    it('returns success on valid login', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'test@example.com', password: 'password123' },
      });
      vi.mocked(loginUser).mockResolvedValue({
        user: { id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true },
        token: 'session-token-456',
      });

      const { res, jsonFn, cookieFn } = mockRes();
      await loginHandler(mockReq({ body: {} }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        user: expect.objectContaining({ id: 'usr_1' }),
        sessionToken: 'session-token-456',
      }));
      expect(cookieFn).toHaveBeenCalledTimes(2);
    });

    it('returns 401 on invalid credentials', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'test@example.com', password: 'wrong' },
      });
      vi.mocked(loginUser).mockRejectedValue(new Error('INVALID_CREDENTIALS'));

      const { res, statusFn, jsonFn } = mockRes();
      await loginHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
      }));
    });

    it('returns 400 when account is Google-only', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'google@example.com', password: 'pass' },
      });
      vi.mocked(loginUser).mockRejectedValue(new Error('USE_GOOGLE_LOGIN'));

      const { res, statusFn, jsonFn } = mockRes();
      await loginHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'USE_GOOGLE_LOGIN' }),
      }));
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'test@example.com', password: 'pass' },
      });
      vi.mocked(loginUser).mockRejectedValue(new Error('UNEXPECTED'));

      const { res, statusFn, jsonFn } = mockRes();
      await loginHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'LOGIN_FAILED' }),
      }));
    });
  });

  // ── POST /logout ──────────────────────────────────────
  describe('POST /logout', () => {
    it('logs out session and clears cookies', () => {
      vi.mocked(extractSessionTokenFromHeaders).mockReturnValue('session-token');

      const { res, jsonFn, clearCookieFn } = mockRes();
      logoutHandler(mockReq(), res);

      expect(logoutSession).toHaveBeenCalledWith('session-token');
      expect(clearCookieFn).toHaveBeenCalledTimes(2); // session + CSRF
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });

    it('clears cookies even when no session token present', () => {
      vi.mocked(extractSessionTokenFromHeaders).mockReturnValue(null);

      const { res, jsonFn, clearCookieFn } = mockRes();
      logoutHandler(mockReq(), res);

      expect(logoutSession).not.toHaveBeenCalled();
      expect(clearCookieFn).toHaveBeenCalledTimes(2);
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });
  });

  // ── POST /forgot-password ─────────────────────────────
  describe('POST /forgot-password', () => {
    it('returns 400 when email validation fails', () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid email', code: 'INVALID_EMAIL' });

      const { res, statusFn, jsonFn } = mockRes();
      forgotPasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_EMAIL' }),
      }));
    });

    it('returns success regardless of whether user exists (prevents enumeration)', () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      vi.mocked(requestPasswordReset).mockReturnValue(null);

      const { res, jsonFn } = mockRes();
      forgotPasswordHandler(mockReq({ body: { email: 'test@example.com' } }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('sends reset email when token is created', () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { email: 'user@example.com' },
      });
      vi.mocked(requestPasswordReset).mockReturnValue('reset-token-123');

      const { res, jsonFn } = mockRes();
      forgotPasswordHandler(mockReq({ body: { email: 'user@example.com' } }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ── POST /reset-password ──────────────────────────────
  describe('POST /reset-password', () => {
    it('returns 400 when validation fails', async () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid' });

      const { res, statusFn, jsonFn } = mockRes();
      await resetPasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns success on valid reset', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { token: 'reset-token', password: 'newpass123' },
      });
      vi.mocked(resetPassword).mockResolvedValue({
        user: { id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true },
        token: 'new-session-token',
      });

      const { res, jsonFn, cookieFn } = mockRes();
      await resetPasswordHandler(mockReq({ body: {} }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        sessionToken: 'new-session-token',
      }));
      expect(cookieFn).toHaveBeenCalledTimes(2);
    });

    it('returns 400 on invalid reset token', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { token: 'bad-token', password: 'newpass123' },
      });
      vi.mocked(resetPassword).mockRejectedValue(new Error('INVALID_RESET_TOKEN'));

      const { res, statusFn, jsonFn } = mockRes();
      await resetPasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_RESET_TOKEN' }),
      }));
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { token: 'token', password: 'newpass123' },
      });
      vi.mocked(resetPassword).mockRejectedValue(new Error('DB_ERROR'));

      const { res, statusFn, jsonFn } = mockRes();
      await resetPasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'RESET_PASSWORD_FAILED' }),
      }));
    });
  });

  // ── GET /me ───────────────────────────────────────────
  describe('GET /me', () => {
    it('returns the authenticated user', () => {
      const user = { id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };
      vi.mocked(getAuthUser).mockReturnValue(user);

      const { res, jsonFn } = mockRes();
      meHandler(mockReq(), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, user });
    });
  });

  // ── POST /profile ─────────────────────────────────────
  describe('POST /profile', () => {
    const authUser = { id: 'usr_1', name: 'Old Name', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };

    beforeEach(() => {
      vi.mocked(getAuthUser).mockReturnValue(authUser);
    });

    it('returns 400 when validation fails', async () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid name', code: 'INVALID_NAME' });

      const { res, statusFn, jsonFn } = mockRes();
      await profileHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_NAME' }),
      }));
    });

    it('returns updated user on success', async () => {
      vi.mocked(validate).mockReturnValue({ success: true, data: { name: 'New Name' } });
      const updatedUser = { ...authUser, name: 'New Name' };
      vi.mocked(updateUserProfile).mockResolvedValue(updatedUser);

      const { res, jsonFn } = mockRes();
      await profileHandler(mockReq({ body: { name: 'New Name' } }), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, user: updatedUser });
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(validate).mockReturnValue({ success: true, data: { name: 'New Name' } });
      vi.mocked(updateUserProfile).mockRejectedValue(new Error('DB_ERROR'));

      const { res, statusFn, jsonFn } = mockRes();
      await profileHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UPDATE_FAILED' }),
      }));
    });
  });

  // ── POST /change-password ─────────────────────────────
  describe('POST /change-password', () => {
    const authUser = { id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };

    beforeEach(() => {
      vi.mocked(getAuthUser).mockReturnValue(authUser);
    });

    it('returns 400 when validation fails', async () => {
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Invalid' });

      const { res, statusFn } = mockRes();
      await changePasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
    });

    it('returns success with new session token', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { currentPassword: 'old', newPassword: 'newpass123' },
      });
      vi.mocked(changeUserPassword).mockResolvedValue({ token: 'new-session-token' });

      const { res, jsonFn, cookieFn } = mockRes();
      await changePasswordHandler(mockReq({ body: {} }), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, sessionToken: 'new-session-token' });
      expect(cookieFn).toHaveBeenCalledTimes(2);
    });

    it('returns 400 on invalid current password', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { currentPassword: 'wrong', newPassword: 'newpass123' },
      });
      vi.mocked(changeUserPassword).mockRejectedValue(new Error('INVALID_CURRENT_PASSWORD'));

      const { res, statusFn, jsonFn } = mockRes();
      await changePasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_CURRENT_PASSWORD' }),
      }));
    });

    it('returns 400 for Google-only account', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { currentPassword: 'pass', newPassword: 'newpass123' },
      });
      vi.mocked(changeUserPassword).mockRejectedValue(new Error('GOOGLE_ONLY_ACCOUNT'));

      const { res, statusFn, jsonFn } = mockRes();
      await changePasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'GOOGLE_ONLY_ACCOUNT' }),
      }));
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(validate).mockReturnValue({
        success: true,
        data: { currentPassword: 'pass', newPassword: 'newpass123' },
      });
      vi.mocked(changeUserPassword).mockRejectedValue(new Error('UNEXPECTED'));

      const { res, statusFn, jsonFn } = mockRes();
      await changePasswordHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'CHANGE_PASSWORD_FAILED' }),
      }));
    });
  });

  // ── POST /verify-email ────────────────────────────────
  describe('POST /verify-email', () => {
    it('returns 400 when token is missing', () => {
      const { res, statusFn, jsonFn } = mockRes();
      verifyEmailHandler(mockReq({ body: {} }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      }));
    });

    it('returns 400 when token is empty string', () => {
      const { res, statusFn, jsonFn } = mockRes();
      verifyEmailHandler(mockReq({ body: { token: '  ' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      }));
    });

    it('returns 400 when verifyEmail returns null (invalid token)', () => {
      vi.mocked(verifyEmail).mockReturnValue(null);

      const { res, statusFn, jsonFn } = mockRes();
      verifyEmailHandler(mockReq({ body: { token: 'invalid-token' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_VERIFICATION_TOKEN' }),
      }));
    });

    it('returns success with user on valid token', () => {
      const user = { id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email' as const, emailVerified: true };
      vi.mocked(verifyEmail).mockReturnValue(user);

      const { res, jsonFn } = mockRes();
      verifyEmailHandler(mockReq({ body: { token: 'valid-token' } }), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, user });
    });
  });

  // ── POST /resend-verification ─────────────────────────
  describe('POST /resend-verification', () => {
    it('returns success immediately when email is already verified', () => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true,
      });

      const { res, jsonFn } = mockRes();
      resendVerificationHandler(mockReq(), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 when email is not found', () => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: false,
      });
      vi.mocked(getUserEmailForVerification).mockReturnValue(null);

      const { res, statusFn, jsonFn } = mockRes();
      resendVerificationHandler(mockReq(), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'EMAIL_NOT_FOUND' }),
      }));
    });

    it('creates verification token and returns success', () => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: false,
      });
      vi.mocked(getUserEmailForVerification).mockReturnValue('test@example.com');
      vi.mocked(createVerificationToken).mockReturnValue('new-ver-token');

      const { res, jsonFn } = mockRes();
      resendVerificationHandler(mockReq(), res);

      expect(createVerificationToken).toHaveBeenCalledWith('usr_1');
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ── GET /addresses ────────────────────────────────────
  describe('GET /addresses', () => {
    it('returns addresses for authenticated user', () => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true,
      });
      const addresses = [{ id: 'addr_1', label: 'Home', lastName: '田中', firstName: '太郎', email: 'test@example.com', phone: '09012345678', postalCode: '1000001', prefecture: '東京都', city: '千代田区', addressLine: '1-1-1', isDefault: true, createdAt: '2026-01-01' }];
      vi.mocked(getSavedAddresses).mockReturnValue(addresses);

      const { res, jsonFn } = mockRes();
      getAddressesHandler(mockReq(), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, addresses });
    });
  });

  // ── POST /addresses ───────────────────────────────────
  describe('POST /addresses', () => {
    const validBody = {
      label: 'Home',
      lastName: '田中',
      firstName: '太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      addressLine: '1-1-1',
      isDefault: true,
    };

    beforeEach(() => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true,
      });
    });

    it('returns 400 when required fields are missing', () => {
      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: { label: 'Home' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ADDRESS' }),
      }));
    });

    it('returns 400 when field exceeds max length', () => {
      const longLabel = 'A'.repeat(41);
      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: { ...validBody, label: longLabel } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ADDRESS' }),
      }));
    });

    it('returns 400 when email is invalid', () => {
      vi.mocked(isValidEmail).mockReturnValue(false);

      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: validBody }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_EMAIL' }),
      }));
    });

    it('returns 400 when phone is invalid', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: { ...validBody, phone: 'abc' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_PHONE' }),
      }));
    });

    it('returns 400 when postal code is invalid', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: { ...validBody, postalCode: '12345' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_POSTAL_CODE' }),
      }));
    });

    it('returns success on valid address', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);
      const address = { id: 'addr_1', ...validBody, createdAt: '2026-01-01' };
      vi.mocked(addSavedAddress).mockReturnValue(address);

      const { res, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: validBody }), res);

      expect(jsonFn).toHaveBeenCalledWith({ success: true, address });
    });

    it('returns 400 when max addresses reached', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);
      vi.mocked(addSavedAddress).mockImplementation(() => { throw new Error('MAX_ADDRESSES_REACHED'); });

      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: validBody }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'MAX_ADDRESSES_REACHED' }),
      }));
    });

    it('returns 500 on unexpected error', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);
      vi.mocked(addSavedAddress).mockImplementation(() => { throw new Error('UNEXPECTED'); });

      const { res, statusFn, jsonFn } = mockRes();
      postAddressesHandler(mockReq({ body: validBody }), res);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ADDRESS_SAVE_FAILED' }),
      }));
    });
  });

  // ── DELETE /addresses/:id ─────────────────────────────
  describe('DELETE /addresses/:id', () => {
    beforeEach(() => {
      vi.mocked(getAuthUser).mockReturnValue({
        id: 'usr_1', name: 'Test', email: 'test@example.com', authProvider: 'email', emailVerified: true,
      });
    });

    it('returns 400 when id is missing', () => {
      const { res, statusFn, jsonFn } = mockRes();
      deleteAddressHandler(mockReq({ params: { id: '' } }), res);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_ADDRESS_ID' }),
      }));
    });

    it('returns 404 when address not found', () => {
      vi.mocked(deleteSavedAddress).mockReturnValue(false);

      const { res, statusFn, jsonFn } = mockRes();
      deleteAddressHandler(mockReq({ params: { id: 'addr_123' } }), res);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ADDRESS_NOT_FOUND' }),
      }));
    });

    it('returns success when address is deleted', () => {
      vi.mocked(deleteSavedAddress).mockReturnValue(true);

      const { res, jsonFn } = mockRes();
      deleteAddressHandler(mockReq({ params: { id: 'addr_123' } }), res);

      expect(deleteSavedAddress).toHaveBeenCalledWith('usr_1', 'addr_123');
      expect(jsonFn).toHaveBeenCalledWith({ success: true });
    });
  });

  // ── GET /csrf ─────────────────────────────────────────
  describe('GET /csrf', () => {
    it('returns existing CSRF token from cookie when present', () => {
      const existingToken = 'a'.repeat(64);
      const { res, jsonFn } = mockRes();
      csrfHandler(
        mockReq({ headers: { cookie: `fable_csrf=${existingToken}` } }),
        res,
      );

      expect(jsonFn).toHaveBeenCalledWith({
        success: true,
        csrfToken: existingToken,
      });
    });

    it('generates new CSRF token when none exists', () => {
      const { res, jsonFn, cookieFn } = mockRes();
      csrfHandler(mockReq({ headers: { cookie: '' } }), res);

      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        csrfToken: expect.any(String),
      }));
      expect(cookieFn).toHaveBeenCalledTimes(1);
    });
  });
});
