import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionSync } from '../../hooks/useSessionSync';

describe('useSessionSync', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves data to sessionStorage', () => {
    renderHook(() => useSessionSync({ key: 'test-key', data: { userId: '123' } }));
    expect(sessionStorage.getItem('test-key')).toBe(JSON.stringify({ userId: '123' }));
  });

  it('does not save when data is null', () => {
    renderHook(() => useSessionSync({ key: 'test-key', data: null }));
    expect(sessionStorage.getItem('test-key')).toBeNull();
  });

  it('does not save when enabled is false', () => {
    renderHook(() => useSessionSync({ key: 'test-key', data: { active: true }, enabled: false }));
    expect(sessionStorage.getItem('test-key')).toBeNull();
  });

  it('updates sessionStorage when data changes', () => {
    const { rerender } = renderHook(
      (props: { data: unknown }) => useSessionSync({ key: 'test-key', data: props.data }),
      { initialProps: { data: { v: 1 } } },
    );

    expect(sessionStorage.getItem('test-key')).toBe(JSON.stringify({ v: 1 }));

    rerender({ data: { v: 2 } });
    expect(sessionStorage.getItem('test-key')).toBe(JSON.stringify({ v: 2 }));
  });

  it('silently handles storage errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    // Should not throw
    expect(() => {
      renderHook(() => useSessionSync({ key: 'test-key', data: { large: true } }));
    }).not.toThrow();
  });
});
