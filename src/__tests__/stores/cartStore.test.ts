import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock Zustand persist middleware as passthrough (no localStorage dependency)
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

import { useCartStore } from '../../stores/cartStore';
import type { CartItem } from '../../types';

beforeEach(() => {
  useCartStore.setState({
    cartItems: [],
  });
});

const makeCartItem = (overrides?: Partial<Omit<CartItem, 'id'>>): Omit<CartItem, 'id'> => ({
  productId: 'prod-1',
  name: 'Portrait',
  artStyleId: 'style-1',
  artStyleName: 'Renaissance',
  imageUrl: 'https://example.com/img.png',
  quantity: 1,
  price: 3000,
  ...overrides,
});

describe('addToCart', () => {
  it('adds a new item to the cart', () => {
    useCartStore.getState().addToCart(makeCartItem());
    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('prod-1');
    expect(cartItems[0].id).toBeDefined();
  });

  it('increments quantity for same product+style+imageUrl', () => {
    const item = makeCartItem({ quantity: 2 });
    useCartStore.getState().addToCart(item);
    useCartStore.getState().addToCart(makeCartItem({ quantity: 3 }));
    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(5);
  });

  it('adds separate items for different productId', () => {
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    expect(useCartStore.getState().cartItems).toHaveLength(2);
  });

  it('adds separate items for different imageUrl', () => {
    useCartStore.getState().addToCart(makeCartItem({ imageUrl: 'img1.png' }));
    useCartStore.getState().addToCart(makeCartItem({ imageUrl: 'img2.png' }));
    expect(useCartStore.getState().cartItems).toHaveLength(2);
  });
});

describe('removeFromCart', () => {
  it('removes the item with the specified id', () => {
    useCartStore.getState().addToCart(makeCartItem());
    const { cartItems } = useCartStore.getState();
    const itemId = cartItems[0].id;

    useCartStore.getState().removeFromCart(itemId);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('does not affect other items', () => {
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    const firstId = useCartStore.getState().cartItems[0].id;

    useCartStore.getState().removeFromCart(firstId);
    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('prod-2');
  });
});

describe('updateCartItemQuantity', () => {
  it('updates the quantity of the specified item', () => {
    useCartStore.getState().addToCart(makeCartItem({ quantity: 1 }));
    const itemId = useCartStore.getState().cartItems[0].id;

    useCartStore.getState().updateCartItemQuantity(itemId, 5);
    expect(useCartStore.getState().cartItems[0].quantity).toBe(5);
  });

  it('removes item when quantity is set to 0', () => {
    useCartStore.getState().addToCart(makeCartItem());
    const itemId = useCartStore.getState().cartItems[0].id;

    useCartStore.getState().updateCartItemQuantity(itemId, 0);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('removes item when quantity is negative', () => {
    useCartStore.getState().addToCart(makeCartItem());
    const itemId = useCartStore.getState().cartItems[0].id;

    useCartStore.getState().updateCartItemQuantity(itemId, -1);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });
});

describe('clearCart', () => {
  it('empties the cart', () => {
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    expect(useCartStore.getState().cartItems).toHaveLength(2);

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });
});
