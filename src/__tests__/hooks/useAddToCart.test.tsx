// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mocks so they are available before imports
const mockNavigate = vi.fn();
const mockAddToCart = vi.fn();
const mockTrackEvent = vi.fn();
const mockTrackMetaAddToCart = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../stores/cartStore', () => ({
  useCartStore: () => ({
    addToCart: mockAddToCart,
  }),
}));

vi.mock('../../lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  trackMetaAddToCart: (...args: unknown[]) => mockTrackMetaAddToCart(...args),
}));

vi.mock('../../data/constants', () => ({
  DISCOUNT_RATE: 0.1,
}));

import { useAddToCart, type UseAddToCartOptions, type ProductToAdd } from '../../hooks/useAddToCart';

const defaultOptions: UseAddToCartOptions = {
  styleId: 'renaissance',
  styleName: 'Renaissance',
  overlayedImageUrl: 'https://example.com/overlay.png',
  portraitName: 'Taro',
  textOverlaySettings: {
    fontId: null,
    decorationId: null,
    position: 'bottom-center',
  },
  isWithin24Hours: false,
};

const defaultProduct: ProductToAdd = {
  id: 'prod-1',
  name: 'Portrait Canvas',
  price: 3000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAddToCart', () => {
  it('returns addedProductId as null initially', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));
    expect(result.current.addedProductId).toBeNull();
  });

  it('adds product to cart with full price when not within 24 hours', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        name: 'Portrait Canvas',
        price: 3000,
        quantity: 1,
        artStyleId: 'renaissance',
        artStyleName: 'Renaissance',
        imageUrl: 'https://example.com/overlay.png',
      })
    );
  });

  it('applies 10% discount when within 24 hours', () => {
    const { result } = renderHook(() =>
      useAddToCart({ ...defaultOptions, isWithin24Hours: true })
    );

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    // Math.floor(3000 * 0.9) = 2700
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 2700,
      })
    );
  });

  it('sets addedProductId after adding to cart', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(result.current.addedProductId).toBe('prod-1');
  });

  it('sends tracking events', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('add_to_cart', {
      productId: 'prod-1',
      price: 3000,
      discount: 0,
    });

    expect(mockTrackMetaAddToCart).toHaveBeenCalledWith({
      content_ids: ['prod-1'],
      content_type: 'product',
      value: 3000,
      currency: 'JPY',
    });
  });

  it('sends tracking events with discount info when within 24 hours', () => {
    const { result } = renderHook(() =>
      useAddToCart({ ...defaultOptions, isWithin24Hours: true })
    );

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('add_to_cart', {
      productId: 'prod-1',
      price: 2700,
      discount: 300,
    });
  });

  it('navigates to /cart after 800ms', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/cart');
  });

  it('prevents double-adding the same product', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    // addToCart should only be called once
    expect(mockAddToCart).toHaveBeenCalledTimes(1);
  });

  it('includes portraitName in options when provided', () => {
    const { result } = renderHook(() => useAddToCart(defaultOptions));

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          portraitName: 'Taro',
          textOverlaySettings: defaultOptions.textOverlaySettings,
        },
      })
    );
  });

  it('does not include options when portraitName is empty', () => {
    const { result } = renderHook(() =>
      useAddToCart({ ...defaultOptions, portraitName: '' })
    );

    act(() => {
      result.current.addProductToCart(defaultProduct);
    });

    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        options: undefined,
      })
    );
  });
});
