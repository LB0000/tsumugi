import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

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

    return {
      cartItems: state.cartItems.map((i) =>
        i.id === id ? { ...i, quantity } : i
      )
    };
  }),
  clearCart: () => set({ cartItems: [] }),
}), {
  name: 'tsumugi-cart',
  version: 1,
}));
