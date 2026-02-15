vi.mock('../../lib/persistence.js', () => ({
  readJsonFile: (_path: string, fallback: unknown) => fallback,
  writeJsonAtomic: async () => {},
}));

import {
  registerUser,
  loginUser,
  getUserBySessionToken,
  requestPasswordReset,
  resetPassword,
  SESSION_TTL_MS,
} from '../../lib/auth.js';

describe('registerUser', () => {
  it('registers a new user and returns user + token', async () => {
    const result = await registerUser({
      name: 'Taro',
      email: 'taro-register@example.com',
      password: 'password123',
    });

    expect(result.user.name).toBe('Taro');
    expect(result.user.email).toBe('taro-register@example.com');
    expect(result.user.authProvider).toBe('email');
    expect(result.user.emailVerified).toBe(false);
    expect(result.token).toMatch(/^sess_/);
  });

  it('throws EMAIL_ALREADY_EXISTS for duplicate email', async () => {
    await registerUser({
      name: 'First',
      email: 'dup@example.com',
      password: 'password123',
    });

    await expect(
      registerUser({
        name: 'Second',
        email: 'dup@example.com',
        password: 'password456',
      }),
    ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
  });

  it('normalizes email to lowercase', async () => {
    const result = await registerUser({
      name: 'Upper',
      email: 'UPPER@Example.COM',
      password: 'password123',
    });

    expect(result.user.email).toBe('upper@example.com');
  });
});

describe('loginUser', () => {
  const email = 'login-test@example.com';
  const password = 'correct-password';

  beforeAll(async () => {
    await registerUser({ name: 'LoginUser', email, password });
  });

  it('logs in with correct credentials', async () => {
    const result = await loginUser({ email, password });
    expect(result.user.email).toBe(email);
    expect(result.token).toMatch(/^sess_/);
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    await expect(
      loginUser({ email, password: 'wrong-password' }),
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('throws INVALID_CREDENTIALS for non-existent email', async () => {
    await expect(
      loginUser({ email: 'nonexistent@example.com', password }),
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });
});

describe('getUserBySessionToken', () => {
  it('returns the user for a valid session token', async () => {
    const { token } = await registerUser({
      name: 'SessionUser',
      email: 'session-test@example.com',
      password: 'password123',
    });

    const user = getUserBySessionToken(token);
    expect(user).not.toBeNull();
    expect(user!.email).toBe('session-test@example.com');
  });

  it('returns null for an expired session', async () => {
    const { token } = await registerUser({
      name: 'ExpiredUser',
      email: 'expired-session@example.com',
      password: 'password123',
    });

    // Advance time past session TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(SESSION_TTL_MS + 1000);

    const user = getUserBySessionToken(token);
    expect(user).toBeNull();

    vi.useRealTimers();
  });

  it('returns null for an invalid token', () => {
    expect(getUserBySessionToken('invalid_token')).toBeNull();
  });
});

describe('resetPassword', () => {
  it('resets password with a valid token', async () => {
    const { user } = await registerUser({
      name: 'ResetUser',
      email: 'reset-test@example.com',
      password: 'old-password',
    });

    const resetToken = requestPasswordReset('reset-test@example.com');
    expect(resetToken).not.toBeNull();

    const result = await resetPassword({
      token: resetToken!,
      newPassword: 'new-password',
    });

    expect(result.user.email).toBe('reset-test@example.com');
    expect(result.token).toMatch(/^sess_/);

    // Verify login works with new password
    const loginResult = await loginUser({
      email: 'reset-test@example.com',
      password: 'new-password',
    });
    expect(loginResult.user.id).toBe(user.id);
  });

  it('throws INVALID_RESET_TOKEN for expired token', async () => {
    await registerUser({
      name: 'ExpiredResetUser',
      email: 'expired-reset@example.com',
      password: 'password123',
    });

    const resetToken = requestPasswordReset('expired-reset@example.com');
    expect(resetToken).not.toBeNull();

    // Advance time past reset token TTL (30 minutes)
    vi.useFakeTimers();
    vi.advanceTimersByTime(31 * 60 * 1000);

    await expect(
      resetPassword({ token: resetToken!, newPassword: 'new-password' }),
    ).rejects.toThrow('INVALID_RESET_TOKEN');

    vi.useRealTimers();
  });

  it('throws INVALID_RESET_TOKEN for an unknown token', async () => {
    await expect(
      resetPassword({ token: 'bogus_token', newPassword: 'new-password' }),
    ).rejects.toThrow('INVALID_RESET_TOKEN');
  });
});
