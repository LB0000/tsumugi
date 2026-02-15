import type { AuthUser } from '../types';
import { API_BASE, buildAuthPostHeaders, buildAuthActionHeaders, fetchWithTimeout } from './common';
import { isErrorResponse, isAuthResponse, isForgotPasswordResponse, isCurrentUserResponse } from './typeGuards';

export interface AuthResponse {
  success: true;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  success: true;
  message: string;
}

export interface CurrentUserResponse {
  success: true;
  user: AuthUser;
}

export async function loginAuth(request: { email: string; password: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'ログインに失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid login response format');
  }

  return data;
}

export async function registerAuth(request: { name: string; email: string; password: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '登録に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid register response format');
  }

  return data;
}

export async function forgotPassword(request: { email: string }): Promise<ForgotPasswordResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'パスワード再設定の送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isForgotPasswordResponse(data)) {
    throw new Error('Invalid forgot-password response format');
  }

  return data;
}

export async function resetPassword(request: { token: string; newPassword: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'パスワード再設定に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid reset-password response format');
  }

  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetchWithTimeout(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'セッション確認に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCurrentUserResponse(data)) {
    throw new Error('Invalid current-user response format');
  }

  return data.user;
}

export async function updateProfile(request: { name: string }): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/profile`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'プロフィールの更新に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid profile response format');
  }

  return data;
}

export async function changePassword(request: { currentPassword: string; newPassword: string }): Promise<void> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'パスワード変更に失敗しました';
    throw new Error(errorMessage);
  }
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'Googleログインに失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid google login response format');
  }

  return data;
}

export async function verifyEmailToken(token: string): Promise<AuthResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token }),
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'メール認証に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAuthResponse(data)) {
    throw new Error('Invalid verify-email response format');
  }

  return data;
}

export async function resendVerification(): Promise<void> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '認証メール再送信に失敗しました';
    throw new Error(errorMessage);
  }
}

export async function logoutAuth(): Promise<void> {
  const headers = await buildAuthActionHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'ログアウトに失敗しました';
    throw new Error(errorMessage);
  }
}
