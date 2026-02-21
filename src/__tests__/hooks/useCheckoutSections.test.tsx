import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckoutSections } from '../../hooks/useCheckoutSections';

describe('useCheckoutSections', () => {
  let observerCallbacks: Map<Element, (entries: IntersectionObserverEntry[]) => void>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observerCallbacks = new Map();
    mockDisconnect = vi.fn();

    // Create DOM elements for the sections
    document.body.innerHTML = '<div id="gift"></div><div id="shipping"></div><div id="payment"></div>';

    vi.stubGlobal('IntersectionObserver', class {
      constructor(public callback: (entries: IntersectionObserverEntry[]) => void) {}
      observe(el: Element) {
        observerCallbacks.set(el, this.callback);
      }
      disconnect = mockDisconnect;
      unobserve = vi.fn();
    });
  });

  it('defaults to gift section', () => {
    const { result } = renderHook(() => useCheckoutSections());
    expect(result.current.activeSection).toBe('gift');
  });

  it('updates active section when shipping becomes visible', () => {
    const { result } = renderHook(() => useCheckoutSections());

    const shippingEl = document.getElementById('shipping')!;
    const callback = observerCallbacks.get(shippingEl);

    act(() => {
      callback?.([{ isIntersecting: true, target: shippingEl } as IntersectionObserverEntry]);
    });

    expect(result.current.activeSection).toBe('shipping');
  });

  it('updates active section when payment becomes visible', () => {
    const { result } = renderHook(() => useCheckoutSections());

    const paymentEl = document.getElementById('payment')!;
    const callback = observerCallbacks.get(paymentEl);

    act(() => {
      callback?.([{ isIntersecting: true, target: paymentEl } as IntersectionObserverEntry]);
    });

    expect(result.current.activeSection).toBe('payment');
  });

  it('does not change section when element is not intersecting', () => {
    const { result } = renderHook(() => useCheckoutSections());

    const shippingEl = document.getElementById('shipping')!;
    const callback = observerCallbacks.get(shippingEl);

    act(() => {
      callback?.([{ isIntersecting: false, target: shippingEl } as IntersectionObserverEntry]);
    });

    expect(result.current.activeSection).toBe('gift');
  });

  it('disconnects observers on unmount', () => {
    const { unmount } = renderHook(() => useCheckoutSections());
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
