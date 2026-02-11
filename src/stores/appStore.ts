import { create } from 'zustand';
import type { ArtStyle, UploadState, StyleFilterState, StyleCategoryId, CartItem, AuthUser } from '../types';
import { artStyles } from '../data/artStyles';

const initialStyleFilterState: StyleFilterState = {
  searchQuery: '',
  selectedTier: 'all',
  selectedCategory: 'all'
};

interface AppState {
  // Category
  selectedCategory: 'pets' | 'family' | 'kids';
  setSelectedCategory: (category: 'pets' | 'family' | 'kids') => void;

  // Style
  selectedStyle: ArtStyle | null;
  setSelectedStyle: (style: ArtStyle | null) => void;
  isStyleModalOpen: boolean;
  openStyleModal: () => void;
  closeStyleModal: () => void;

  // Style Filter
  styleFilterState: StyleFilterState;
  setStyleSearchQuery: (query: string) => void;
  setStyleTierFilter: (tier: StyleFilterState['selectedTier']) => void;
  setStyleCategoryFilter: (category: StyleCategoryId) => void;
  resetStyleFilters: () => void;

  // Upload
  uploadState: UploadState;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUpload: () => void;

  // Generated Image
  generatedImage: string | null;
  setGeneratedImage: (image: string | null) => void;

  // Sidebar
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Current Step
  currentStep: 'upload' | 'preview' | 'download';
  setCurrentStep: (step: 'upload' | 'preview' | 'download') => void;

  // Cart
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  // Auth
  authUser: AuthUser | null;
  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
}

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
  previewUrl: null,
  errorMessage: null
};

export const useAppStore = create<AppState>((set) => ({

  // Category
  selectedCategory: 'pets',
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Style
  selectedStyle: artStyles.find(s => s.isIntelligent) || null,
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  isStyleModalOpen: false,
  openStyleModal: () => set({ isStyleModalOpen: true }),
  closeStyleModal: () => set({ isStyleModalOpen: false, styleFilterState: initialStyleFilterState }),

  // Style Filter
  styleFilterState: initialStyleFilterState,
  setStyleSearchQuery: (query) => set((state) => ({
    styleFilterState: { ...state.styleFilterState, searchQuery: query }
  })),
  setStyleTierFilter: (tier) => set((state) => ({
    styleFilterState: { ...state.styleFilterState, selectedTier: tier }
  })),
  setStyleCategoryFilter: (category) => set((state) => ({
    styleFilterState: { ...state.styleFilterState, selectedCategory: category }
  })),
  resetStyleFilters: () => set({ styleFilterState: initialStyleFilterState }),

  // Upload
  uploadState: initialUploadState,
  setUploadState: (state) => set((prev) => ({
    uploadState: { ...prev.uploadState, ...state }
  })),
  resetUpload: () => set({
    uploadState: initialUploadState,
    generatedImage: null,
    currentStep: 'upload'
  }),

  // Generated Image
  generatedImage: null,
  setGeneratedImage: (image) => set({ generatedImage: image }),

  // Sidebar
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Current Step
  currentStep: 'upload',
  setCurrentStep: (step) => set({ currentStep: step }),

  // Cart
  cartItems: [],
  addToCart: (item) => set((state) => {
    // 同じ商品・スタイル・オプションのアイテムがあれば数量を増やす
    const existingItemIndex = state.cartItems.findIndex(i =>
      i.productId === item.productId &&
      i.artStyleId === item.artStyleId &&
      i.imageUrl === item.imageUrl
    );

    if (existingItemIndex > -1) {
      const newCartItems = [...state.cartItems];
      newCartItems[existingItemIndex].quantity += item.quantity;
      return { cartItems: newCartItems };
    }

    return {
      cartItems: [...state.cartItems, { ...item, id: Math.random().toString(36).substring(7) }]
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

  // Auth
  authUser: null,
  setAuthSession: (user) => {
    set({ authUser: user });
  },
  clearAuthSession: () => {
    set({ authUser: null });
  }
}));
