import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';
import { saveCart } from '../api/cart';
import { useAuthStore } from './authStore';
import { CART_TTL_MS } from '../data/shipping';

interface CartState {
  cartItems: CartItem[];
  lastUpdatedAt: number;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  updateItemOptions: (id: string, options: CartItem['options']) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(persist((set) => ({
  cartItems: [],
  lastUpdatedAt: Date.now(),
  addToCart: (item) => set((state) => {
    // 同じ商品・スタイル・画像URL・オプション（名前）のアイテムがあれば数量を増やす
    const existingItemIndex = state.cartItems.findIndex(i =>
      i.productId === item.productId &&
      i.artStyleId === item.artStyleId &&
      i.imageUrl === item.imageUrl &&
      JSON.stringify(i.options) === JSON.stringify(item.options)
    );

    if (existingItemIndex > -1) {
      const newCartItems = state.cartItems.map((ci, idx) =>
        idx === existingItemIndex
          ? { ...ci, quantity: ci.quantity + item.quantity }
          : ci
      );
      return { cartItems: newCartItems, lastUpdatedAt: Date.now() };
    }

    return {
      cartItems: [...state.cartItems, { ...item, id: crypto.randomUUID() }],
      lastUpdatedAt: Date.now(),
    };
  }),
  removeFromCart: (id) => set((state) => ({
    cartItems: state.cartItems.filter((i) => i.id !== id),
    lastUpdatedAt: Date.now(),
  })),
  updateCartItemQuantity: (id, quantity) => set((state) => {
    if (quantity <= 0) {
      return {
        cartItems: state.cartItems.filter((i) => i.id !== id),
        lastUpdatedAt: Date.now(),
      };
    }

    const clamped = Math.min(quantity, 10);
    return {
      cartItems: state.cartItems.map((i) =>
        i.id === id ? { ...i, quantity: clamped } : i
      ),
      lastUpdatedAt: Date.now(),
    };
  }),
  updateItemOptions: (id, options) => set((state) => ({
    cartItems: state.cartItems.map((i) =>
      i.id === id ? { ...i, options } : i
    ),
    lastUpdatedAt: Date.now(),
  })),
  clearCart: () => set({ cartItems: [], lastUpdatedAt: Date.now() }),
}), {
  name: 'tsumugi-cart',
  version: 2,
  onRehydrateStorage: () => (state) => {
    if (!state || state.cartItems.length === 0) return;
    const elapsed = Date.now() - state.lastUpdatedAt;
    if (elapsed > CART_TTL_MS) {
      state.clearCart();
    }
  },
}));

// Debounced server-side cart sync for logged-in users
let saveCartTimer: ReturnType<typeof setTimeout> | null = null;

useCartStore.subscribe((state) => {
  if (saveCartTimer) clearTimeout(saveCartTimer);
  saveCartTimer = setTimeout(() => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser) return;
    const items = state.cartItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));
    saveCart(items).catch(() => {
      // Silently ignore save errors — local storage is the primary persistence
    });
  }, 30_000);
});
