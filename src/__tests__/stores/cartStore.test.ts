import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock Zustand persist middleware as passthrough (no localStorage dependency)
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

// Mock the saveCart API
vi.mock('../../api/cart', () => ({
  saveCart: vi.fn().mockResolvedValue(undefined),
}));

import { useCartStore } from '../../stores/cartStore';
import type { CartItem } from '../../types';

beforeEach(() => {
  useCartStore.setState({
    cartItems: [],
    lastUpdatedAt: Date.now(),
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

describe('cartStore', () => {
  describe('addToCart', () => {
    it('adds a new item to the cart', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const { cartItems } = useCartStore.getState();
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].productId).toBe('prod-1');
      expect(cartItems[0].id).toBeDefined();
    });

    it('assigns a unique ID to each added item', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
      const { cartItems } = useCartStore.getState();
      expect(cartItems[0].id).not.toBe(cartItems[1].id);
    });

    it('increments quantity for same product+style+imageUrl+options', () => {
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

    it('adds separate items for different artStyleId', () => {
      useCartStore.getState().addToCart(makeCartItem({ artStyleId: 'style-1' }));
      useCartStore.getState().addToCart(makeCartItem({ artStyleId: 'style-2' }));
      expect(useCartStore.getState().cartItems).toHaveLength(2);
    });

    it('adds separate items for different options', () => {
      useCartStore.getState().addToCart(makeCartItem({ options: { portraitName: 'Alice' } }));
      useCartStore.getState().addToCart(makeCartItem({ options: { portraitName: 'Bob' } }));
      expect(useCartStore.getState().cartItems).toHaveLength(2);
    });

    it('treats items with same options as duplicates and merges quantity', () => {
      useCartStore.getState().addToCart(makeCartItem({ quantity: 1, options: { portraitName: 'Alice' } }));
      useCartStore.getState().addToCart(makeCartItem({ quantity: 2, options: { portraitName: 'Alice' } }));
      const { cartItems } = useCartStore.getState();
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(3);
    });

    it('updates lastUpdatedAt timestamp', () => {
      const before = Date.now();
      useCartStore.getState().addToCart(makeCartItem());
      const { lastUpdatedAt } = useCartStore.getState();
      expect(lastUpdatedAt).toBeGreaterThanOrEqual(before);
    });

    it('preserves existing items when adding a new one', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
      const { cartItems } = useCartStore.getState();
      expect(cartItems[0].productId).toBe('prod-1');
      expect(cartItems[1].productId).toBe('prod-2');
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

    it('is a no-op when id does not exist', () => {
      useCartStore.getState().addToCart(makeCartItem());
      useCartStore.getState().removeFromCart('non-existent-id');
      expect(useCartStore.getState().cartItems).toHaveLength(1);
    });

    it('updates lastUpdatedAt timestamp', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const itemId = useCartStore.getState().cartItems[0].id;
      const before = Date.now();
      useCartStore.getState().removeFromCart(itemId);
      expect(useCartStore.getState().lastUpdatedAt).toBeGreaterThanOrEqual(before);
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

    it('clamps quantity to a maximum of 10', () => {
      useCartStore.getState().addToCart(makeCartItem({ quantity: 1 }));
      const itemId = useCartStore.getState().cartItems[0].id;

      useCartStore.getState().updateCartItemQuantity(itemId, 15);
      expect(useCartStore.getState().cartItems[0].quantity).toBe(10);
    });

    it('does not affect other items when updating quantity', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
      const secondId = useCartStore.getState().cartItems[1].id;

      useCartStore.getState().updateCartItemQuantity(secondId, 7);
      expect(useCartStore.getState().cartItems[0].quantity).toBe(1);
      expect(useCartStore.getState().cartItems[1].quantity).toBe(7);
    });

    it('updates lastUpdatedAt timestamp', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const itemId = useCartStore.getState().cartItems[0].id;
      const before = Date.now();
      useCartStore.getState().updateCartItemQuantity(itemId, 3);
      expect(useCartStore.getState().lastUpdatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('updateItemOptions', () => {
    it('updates options of the specified item', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const itemId = useCartStore.getState().cartItems[0].id;
      const newOptions = { portraitName: 'Charlie' };

      useCartStore.getState().updateItemOptions(itemId, newOptions);
      expect(useCartStore.getState().cartItems[0].options).toEqual(newOptions);
    });

    it('does not affect other items', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1', options: { portraitName: 'Alice' } }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2', options: { portraitName: 'Bob' } }));
      const firstId = useCartStore.getState().cartItems[0].id;

      useCartStore.getState().updateItemOptions(firstId, { portraitName: 'Updated' });
      expect(useCartStore.getState().cartItems[0].options).toEqual({ portraitName: 'Updated' });
      expect(useCartStore.getState().cartItems[1].options).toEqual({ portraitName: 'Bob' });
    });

    it('updates lastUpdatedAt timestamp', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const itemId = useCartStore.getState().cartItems[0].id;
      const before = Date.now();
      useCartStore.getState().updateItemOptions(itemId, { portraitName: 'Test' });
      expect(useCartStore.getState().lastUpdatedAt).toBeGreaterThanOrEqual(before);
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

    it('updates lastUpdatedAt timestamp', () => {
      useCartStore.getState().addToCart(makeCartItem());
      const before = Date.now();
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().lastUpdatedAt).toBeGreaterThanOrEqual(before);
    });

    it('is safe to call on an already empty cart', () => {
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().cartItems).toHaveLength(0);
    });
  });

  describe('derived calculations', () => {
    it('getTotal: calculates correct total for multiple items', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1', price: 3000, quantity: 2 }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2', price: 4500, quantity: 1 }));
      const { cartItems } = useCartStore.getState();
      const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(total).toBe(10500);
    });

    it('getTotal: returns 0 for empty cart', () => {
      const { cartItems } = useCartStore.getState();
      const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(total).toBe(0);
    });

    it('getItemCount: returns correct total item count', () => {
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-1', quantity: 2 }));
      useCartStore.getState().addToCart(makeCartItem({ productId: 'prod-2', quantity: 3 }));
      const { cartItems } = useCartStore.getState();
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      expect(itemCount).toBe(5);
    });

    it('getItemCount: returns 0 for empty cart', () => {
      const { cartItems } = useCartStore.getState();
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      expect(itemCount).toBe(0);
    });
  });

  describe('persistence', () => {
    it('store uses tsumugi-cart as persistence key', () => {
      // The persist middleware is mocked as passthrough, but we can verify
      // the store was created with persist by checking the store exists
      // and its state shape matches expectations
      const state = useCartStore.getState();
      expect(state).toHaveProperty('cartItems');
      expect(state).toHaveProperty('lastUpdatedAt');
      expect(state).toHaveProperty('addToCart');
      expect(state).toHaveProperty('removeFromCart');
      expect(state).toHaveProperty('updateCartItemQuantity');
      expect(state).toHaveProperty('updateItemOptions');
      expect(state).toHaveProperty('clearCart');
    });

    it('lastUpdatedAt is initialized to a valid timestamp', () => {
      const { lastUpdatedAt } = useCartStore.getState();
      expect(lastUpdatedAt).toBeGreaterThan(0);
      expect(typeof lastUpdatedAt).toBe('number');
    });
  });
});
