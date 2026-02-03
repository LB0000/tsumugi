import { create } from 'zustand';
import type { ArtStyle, UploadState, StyleFilterState, StyleCategoryId } from '../types';
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
  setCurrentStep: (step) => set({ currentStep: step })
}));
