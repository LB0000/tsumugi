import { isErrorResponse, isCsrfResponse } from './typeGuards';
import { config } from '../config';

export const API_BASE = config.apiBase;

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface CsrfResponse {
  success: true;
  csrfToken: string;
}

export async function getFreshCsrfToken(): Promise<string> {
  const response = await fetchWithTimeout(`${API_BASE}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'CSRFトークンの取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCsrfResponse(data)) {
    throw new Error('Invalid csrf response format');
  }

  return data.csrfToken;
}

export async function buildAuthPostHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getFreshCsrfToken();
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };
}

export async function buildAuthActionHeaders(): Promise<Record<string, string>> {
  const csrfToken = await getFreshCsrfToken();
  return {
    'X-CSRF-Token': csrfToken,
  };
}

export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
