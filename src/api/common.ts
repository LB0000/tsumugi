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

function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0];
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  // Fallback for browsers without AbortSignal.any (Safari < 17.4)
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 30000,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  const signals: AbortSignal[] = [timeoutController.signal];
  if (options?.signal) signals.push(options.signal);
  const combinedSignal = combineSignals(signals);

  try {
    const response = await fetch(url, {
      ...options,
      signal: combinedSignal,
    });

    if (response.status === 401 && !url.includes('/auth/')) {
      const { useAuthStore } = await import('../stores/authStore');
      useAuthStore.getState().clearAuthSession();
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timeoutController.signal.aborted) {
        throw new Error('リクエストがタイムアウトしました');
      }
      throw error;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
