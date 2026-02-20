import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMockupPreview } from '../../hooks/useMockupPreview';

// Mock the compositeOnMockup module
vi.mock('../../lib/mockupComposite', () => ({
  hasMockupConfig: (id: string) => ['acrylic-stand', 'canvas'].includes(id),
  compositeOnMockup: vi.fn(),
}));

import { compositeOnMockup } from '../../lib/mockupComposite';
const mockComposite = vi.mocked(compositeOnMockup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMockupPreview', () => {
  it('returns null mockupUrl when generatedImageUrl is null', () => {
    const { result } = renderHook(() => useMockupPreview(null, 'acrylic-stand'));

    expect(result.current.mockupUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns null mockupUrl for product without mockup config', () => {
    const { result } = renderHook(() => useMockupPreview('data:image/png;base64,abc', 'download'));

    expect(result.current.mockupUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading while compositing', async () => {
    let resolveComposite!: (value: string | null) => void;
    mockComposite.mockReturnValue(
      new Promise((resolve) => {
        resolveComposite = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useMockupPreview('data:image/png;base64,abc', 'acrylic-stand'),
    );

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the composite
    resolveComposite('data:image/jpeg;base64,result');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mockupUrl).toBe('data:image/jpeg;base64,result');
    expect(result.current.error).toBeNull();
  });

  it('sets error on composite failure', async () => {
    mockComposite.mockRejectedValue(new Error('Canvas error'));

    const { result } = renderHook(() =>
      useMockupPreview('data:image/png;base64,abc', 'acrylic-stand'),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('モックアップの生成に失敗しました');
    });

    expect(result.current.mockupUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores stale results when inputs change rapidly', async () => {
    let resolveFirst!: (value: string | null) => void;
    mockComposite
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce('data:image/jpeg;base64,second');

    const { result, rerender } = renderHook(
      ({ url, productId }) => useMockupPreview(url, productId),
      { initialProps: { url: 'data:image/png;base64,first' as string | null, productId: 'acrylic-stand' } },
    );

    // Rerender with new URL before first resolves
    rerender({ url: 'data:image/png;base64,second', productId: 'acrylic-stand' });

    // Resolve the first (stale) request
    resolveFirst('data:image/jpeg;base64,stale');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use the second result, not the stale first
    expect(result.current.mockupUrl).toBe('data:image/jpeg;base64,second');
  });

  it('resets state when input becomes invalid', async () => {
    mockComposite.mockResolvedValue('data:image/jpeg;base64,result');

    const { result, rerender } = renderHook(
      ({ url, productId }) => useMockupPreview(url, productId),
      { initialProps: { url: 'data:image/png;base64,abc' as string | null, productId: 'acrylic-stand' } },
    );

    await waitFor(() => {
      expect(result.current.mockupUrl).toBe('data:image/jpeg;base64,result');
    });

    // Set URL to null
    rerender({ url: null, productId: 'acrylic-stand' });

    expect(result.current.mockupUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
