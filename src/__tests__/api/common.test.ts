import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ sessionToken: null, clearAuthSession: vi.fn() }),
  },
}));

vi.mock('../../config', () => ({
  config: { apiBase: 'https://api.test.com' },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { fetchWithRetry } from '../../api/common';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('fetchWithRetry', () => {
  it('returns response on first success', async () => {
    mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 502 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 504 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('Timeout', { status: 504 }))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 400', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 401', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'text/plain' },
    }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns error response after maxRetries exhausted', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { maxRetries: 2, baseDelayMs: 0 });
    // After 2 retries (3 attempts total), returns the last 502
    expect(result.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on network error and succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on AbortError', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    await expect(
      fetchWithRetry('https://api.test.com/data', undefined, { baseDelayMs: 0 }),
    ).rejects.toThrow('Aborted');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('respects maxRetries=0 (no retries)', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));

    const result = await fetchWithRetry('https://api.test.com/data', undefined, { maxRetries: 0, baseDelayMs: 0 });
    expect(result.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws network error after all retries exhausted', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      fetchWithRetry('https://api.test.com/data', undefined, { maxRetries: 2, baseDelayMs: 0 }),
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
