import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';
import { saveCart } from '../api/cart';
import { useAuthStore } from './authStore';

interface CartState {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(persist((set) => ({
  cartItems: [],
  addToCart: (item) => set((state) => {
    // 同じ商品・スタイル・オプションのアイテムがあれば数量を増やす
    const existingItemIndex = state.cartItems.findIndex(i =>
      i.productId === item.productId &&
      i.artStyleId === item.artStyleId &&
      i.imageUrl === item.imageUrl
    );

    if (existingItemIndex > -1) {
      const newCartItems = state.cartItems.map((ci, idx) =>
        idx === existingItemIndex
          ? { ...ci, quantity: ci.quantity + item.quantity }
          : ci
      );
      return { cartItems: newCartItems };
    }

    return {
      cartItems: [...state.cartItems, { ...item, id: crypto.randomUUID() }]
    };
  }),
  removeFromCart: (id) => set((state) => ({
    cartItems: state.cartItems.filter((i) => i.id !== id)
  })),
  updateCartItemQuantity: (id, quantity) => set((state) => {
    if (quantity <= 0) {
      return { cartItems: state.cartItems.filter((i) => i.id !== id) };
    }

    const clamped = Math.min(quantity, 10);
    return {
      cartItems: state.cartItems.map((i) =>
        i.id === id ? { ...i, quantity: clamped } : i
      )
    };
  }),
  clearCart: () => set({ cartItems: [] }),
}), {
  name: 'tsumugi-cart',
  version: 1,
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
