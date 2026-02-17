import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ArtStyle, UploadState, StyleFilterState, StyleCategoryId } from '../types';
import { artStyles } from '../data/artStyles';

const initialStyleFilterState: StyleFilterState = {
  searchQuery: '',
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
  setStyleCategoryFilter: (category: StyleCategoryId) => void;
  resetStyleFilters: () => void;

  // Upload
  uploadState: UploadState;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUpload: () => void;

  // Generated Image
  generatedImage: string | null;
  gallerySaved: boolean | null;
  setGeneratedImage: (image: string | null) => void;
  setGallerySaved: (saved: boolean | null) => void;

  // Portrait Name (名入れ機能)
  portraitName: string;
  setPortraitName: (name: string) => void;
  clearPortraitName: () => void;

  // Sidebar
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Current Step
  currentStep: 'upload' | 'preview' | 'download';
  setCurrentStep: (step: 'upload' | 'preview' | 'download') => void;

  // Gift Options
  giftOptions: {
    isGift: boolean;
    wrappingId: string | null;
    noshiType: string | null;
    messageCard: string;
  } | null;
  setGiftOptions: (options: AppState['giftOptions']) => void;
  clearGiftOptions: () => void;
}

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
  previewUrl: null,
  errorMessage: null,
  rawFile: null
};

export const useAppStore = create<AppState>()(persist((set) => ({

  // Category
  selectedCategory: 'pets',
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Style
  selectedStyle: artStyles[0] || null,
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  isStyleModalOpen: false,
  openStyleModal: () => set({ isStyleModalOpen: true }),
  closeStyleModal: () => set({ isStyleModalOpen: false, styleFilterState: initialStyleFilterState }),

  // Style Filter
  styleFilterState: initialStyleFilterState,
  setStyleSearchQuery: (query) => set((state) => ({
    styleFilterState: { ...state.styleFilterState, searchQuery: query }
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
    gallerySaved: null,
    portraitName: '',  // Clear portrait name on reset
    currentStep: 'upload'
  }),

  // Generated Image
  generatedImage: null,
  gallerySaved: null,
  setGeneratedImage: (image) => set({ generatedImage: image }),
  setGallerySaved: (saved) => set({ gallerySaved: saved }),

  // Portrait Name (名入れ機能)
  portraitName: '',
  setPortraitName: (name) => set({ portraitName: name }),
  clearPortraitName: () => set({ portraitName: '' }),

  // Sidebar
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Current Step
  currentStep: 'upload',
  setCurrentStep: (step) => set({ currentStep: step }),

  // Gift Options
  giftOptions: null,
  setGiftOptions: (options) => set({ giftOptions: options }),
  clearGiftOptions: () => set({ giftOptions: null }),
}), {
  name: 'tsumugi-app',
  storage: {
    getItem: (name) => {
      try {
        const value = sessionStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch {
        sessionStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        sessionStorage.setItem(name, JSON.stringify(value));
      } catch {
        // sessionStorage quota exceeded — graceful degradation
      }
    },
    removeItem: (name) => {
      sessionStorage.removeItem(name);
    },
  },
  partialize: (state) => ({
    generatedImage: state.generatedImage,
    selectedStyle: state.selectedStyle,
    gallerySaved: state.gallerySaved,
    portraitName: state.portraitName,
  } as AppState),
}));
