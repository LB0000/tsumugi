// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock zustand/middleware persist as passthrough (no sessionStorage dependency)
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

import { useAppStore } from '../../stores/appStore';
import { DEFAULT_TEXT_OVERLAY_SETTINGS } from '../../types/textOverlay';

const initialUploadState = {
  status: 'idle' as const,
  progress: 0,
  previewUrl: null,
  errorMessage: null,
  rawFile: null,
  croppedFile: null,
  croppedPreviewUrl: null,
};

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    selectedCategory: 'pets',
    selectedStyle: null,
    isStyleModalOpen: false,
    styleFilterState: { searchQuery: '', selectedCategory: 'all' },
    uploadState: initialUploadState,
    generatedImage: null,
    gallerySaved: null,
    portraitName: '',
    textOverlaySettings: DEFAULT_TEXT_OVERLAY_SETTINGS,
    isSidebarOpen: false,
    currentStep: 'upload',
    giftOptions: null,
  });
});

describe('Category', () => {
  it('defaults selectedCategory to pets', () => {
    expect(useAppStore.getState().selectedCategory).toBe('pets');
  });

  it('setSelectedCategory updates the category', () => {
    useAppStore.getState().setSelectedCategory('family');
    expect(useAppStore.getState().selectedCategory).toBe('family');
  });

  it('setSelectedCategory to kids', () => {
    useAppStore.getState().setSelectedCategory('kids');
    expect(useAppStore.getState().selectedCategory).toBe('kids');
  });
});

describe('Style', () => {
  it('setSelectedStyle sets the style', () => {
    const style = { id: 'baroque', name: 'Baroque' } as Parameters<typeof useAppStore.getState().setSelectedStyle>[0];
    useAppStore.getState().setSelectedStyle(style);
    expect(useAppStore.getState().selectedStyle).toBe(style);
  });

  it('setSelectedStyle to null clears the style', () => {
    useAppStore.getState().setSelectedStyle(null);
    expect(useAppStore.getState().selectedStyle).toBeNull();
  });

  it('openStyleModal sets isStyleModalOpen to true', () => {
    useAppStore.getState().openStyleModal();
    expect(useAppStore.getState().isStyleModalOpen).toBe(true);
  });

  it('closeStyleModal sets isStyleModalOpen to false and resets filters', () => {
    useAppStore.setState({
      isStyleModalOpen: true,
      styleFilterState: { searchQuery: 'test', selectedCategory: 'western' },
    });
    useAppStore.getState().closeStyleModal();
    expect(useAppStore.getState().isStyleModalOpen).toBe(false);
    expect(useAppStore.getState().styleFilterState).toEqual({
      searchQuery: '',
      selectedCategory: 'all',
    });
  });
});

describe('Style Filter', () => {
  it('setStyleSearchQuery updates search query', () => {
    useAppStore.getState().setStyleSearchQuery('baroque');
    expect(useAppStore.getState().styleFilterState.searchQuery).toBe('baroque');
  });

  it('setStyleCategoryFilter updates category filter', () => {
    useAppStore.getState().setStyleCategoryFilter('japanese');
    expect(useAppStore.getState().styleFilterState.selectedCategory).toBe('japanese');
  });

  it('resetStyleFilters resets to initial filter state', () => {
    useAppStore.setState({
      styleFilterState: { searchQuery: 'test', selectedCategory: 'pop' },
    });
    useAppStore.getState().resetStyleFilters();
    expect(useAppStore.getState().styleFilterState).toEqual({
      searchQuery: '',
      selectedCategory: 'all',
    });
  });

  it('preserves other filter state when updating search query', () => {
    useAppStore.getState().setStyleCategoryFilter('western');
    useAppStore.getState().setStyleSearchQuery('baroque');
    expect(useAppStore.getState().styleFilterState).toEqual({
      searchQuery: 'baroque',
      selectedCategory: 'western',
    });
  });
});

describe('Upload', () => {
  it('setUploadState merges partial updates', () => {
    useAppStore.getState().setUploadState({ status: 'uploading', progress: 50 });
    const { uploadState } = useAppStore.getState();
    expect(uploadState.status).toBe('uploading');
    expect(uploadState.progress).toBe(50);
    expect(uploadState.previewUrl).toBeNull(); // unchanged
  });

  it('setUploadState revokes old croppedPreviewUrl on replacement', () => {
    const mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    useAppStore.setState({
      uploadState: { ...initialUploadState, croppedPreviewUrl: 'blob:old-url' },
    });

    useAppStore.getState().setUploadState({ croppedPreviewUrl: 'blob:new-url' });
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:old-url');

    mockRevokeObjectURL.mockRestore();
  });

  it('setUploadState does not revoke when croppedPreviewUrl is unchanged', () => {
    const mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    useAppStore.setState({
      uploadState: { ...initialUploadState, croppedPreviewUrl: 'blob:same-url' },
    });

    useAppStore.getState().setUploadState({ status: 'complete' });
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    mockRevokeObjectURL.mockRestore();
  });

  it('resetUpload resets upload state, generatedImage, and currentStep', () => {
    useAppStore.setState({
      uploadState: {
        status: 'complete',
        progress: 100,
        previewUrl: 'preview.png',
        errorMessage: null,
        rawFile: null,
        croppedFile: null,
        croppedPreviewUrl: null,
      },
      generatedImage: 'generated.png',
      gallerySaved: true,
      portraitName: 'TestName',
      currentStep: 'download',
    });

    useAppStore.getState().resetUpload();

    const state = useAppStore.getState();
    expect(state.uploadState).toEqual(initialUploadState);
    expect(state.generatedImage).toBeNull();
    expect(state.gallerySaved).toBeNull();
    expect(state.portraitName).toBe('');
    expect(state.textOverlaySettings).toEqual(DEFAULT_TEXT_OVERLAY_SETTINGS);
    expect(state.currentStep).toBe('upload');
  });

  it('resetUpload revokes croppedPreviewUrl if present', () => {
    const mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    useAppStore.setState({
      uploadState: { ...initialUploadState, croppedPreviewUrl: 'blob:cropped-url' },
    });

    useAppStore.getState().resetUpload();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:cropped-url');

    mockRevokeObjectURL.mockRestore();
  });
});

describe('Generated Image', () => {
  it('setGeneratedImage stores the image URL', () => {
    useAppStore.getState().setGeneratedImage('data:image/png;base64,abc');
    expect(useAppStore.getState().generatedImage).toBe('data:image/png;base64,abc');
  });

  it('setGeneratedImage can clear with null', () => {
    useAppStore.getState().setGeneratedImage('img.png');
    useAppStore.getState().setGeneratedImage(null);
    expect(useAppStore.getState().generatedImage).toBeNull();
  });

  it('setGallerySaved updates gallery saved flag', () => {
    useAppStore.getState().setGallerySaved(true);
    expect(useAppStore.getState().gallerySaved).toBe(true);
  });

  it('setGallerySaved can be set to null', () => {
    useAppStore.getState().setGallerySaved(true);
    useAppStore.getState().setGallerySaved(null);
    expect(useAppStore.getState().gallerySaved).toBeNull();
  });
});

describe('Portrait Name', () => {
  it('setPortraitName updates the name', () => {
    useAppStore.getState().setPortraitName('Taro');
    expect(useAppStore.getState().portraitName).toBe('Taro');
  });

  it('clearPortraitName resets to empty string', () => {
    useAppStore.getState().setPortraitName('Taro');
    useAppStore.getState().clearPortraitName();
    expect(useAppStore.getState().portraitName).toBe('');
  });
});

describe('Text Overlay Settings', () => {
  it('setTextOverlaySettings replaces the entire settings', () => {
    const newSettings = {
      fontId: 'font-1',
      decorationId: 'deco-1',
      position: 'top-center' as const,
    };
    useAppStore.getState().setTextOverlaySettings(newSettings);
    expect(useAppStore.getState().textOverlaySettings).toEqual(newSettings);
  });

  it('updateTextOverlaySettings merges partial updates', () => {
    useAppStore.getState().updateTextOverlaySettings({ fontId: 'font-2' });
    const settings = useAppStore.getState().textOverlaySettings;
    expect(settings.fontId).toBe('font-2');
    expect(settings.decorationId).toBeNull(); // unchanged
    expect(settings.position).toBe('bottom-center'); // unchanged
  });

  it('resetTextOverlaySettings resets to defaults', () => {
    useAppStore.getState().setTextOverlaySettings({
      fontId: 'font-1',
      decorationId: 'deco-1',
      position: 'top-left',
    });
    useAppStore.getState().resetTextOverlaySettings();
    expect(useAppStore.getState().textOverlaySettings).toEqual(DEFAULT_TEXT_OVERLAY_SETTINGS);
  });
});

describe('Sidebar', () => {
  it('openSidebar sets isSidebarOpen to true', () => {
    useAppStore.getState().openSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(true);
  });

  it('closeSidebar sets isSidebarOpen to false', () => {
    useAppStore.setState({ isSidebarOpen: true });
    useAppStore.getState().closeSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
  });

  it('toggleSidebar toggles the state', () => {
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(true);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().isSidebarOpen).toBe(false);
  });
});

describe('Current Step', () => {
  it('defaults to upload', () => {
    expect(useAppStore.getState().currentStep).toBe('upload');
  });

  it('setCurrentStep updates the step', () => {
    useAppStore.getState().setCurrentStep('preview');
    expect(useAppStore.getState().currentStep).toBe('preview');
  });

  it('setCurrentStep to download', () => {
    useAppStore.getState().setCurrentStep('download');
    expect(useAppStore.getState().currentStep).toBe('download');
  });
});

describe('Gift Options', () => {
  it('defaults to null', () => {
    expect(useAppStore.getState().giftOptions).toBeNull();
  });

  it('setGiftOptions sets gift options', () => {
    const options = {
      isGift: true,
      wrappingId: 'wrap-1',
      noshiType: 'noshi-1',
      messageCard: 'Happy Birthday!',
    };
    useAppStore.getState().setGiftOptions(options);
    expect(useAppStore.getState().giftOptions).toEqual(options);
  });

  it('clearGiftOptions resets to null', () => {
    useAppStore.getState().setGiftOptions({
      isGift: true,
      wrappingId: 'wrap-1',
      noshiType: null,
      messageCard: '',
    });
    useAppStore.getState().clearGiftOptions();
    expect(useAppStore.getState().giftOptions).toBeNull();
  });

  it('setGiftOptions can set to null', () => {
    useAppStore.getState().setGiftOptions({
      isGift: true,
      wrappingId: null,
      noshiType: null,
      messageCard: '',
    });
    useAppStore.getState().setGiftOptions(null);
    expect(useAppStore.getState().giftOptions).toBeNull();
  });
});

describe('Store shape', () => {
  it('has all expected action methods', () => {
    const state = useAppStore.getState();
    expect(typeof state.setSelectedCategory).toBe('function');
    expect(typeof state.setSelectedStyle).toBe('function');
    expect(typeof state.openStyleModal).toBe('function');
    expect(typeof state.closeStyleModal).toBe('function');
    expect(typeof state.setStyleSearchQuery).toBe('function');
    expect(typeof state.setStyleCategoryFilter).toBe('function');
    expect(typeof state.resetStyleFilters).toBe('function');
    expect(typeof state.setUploadState).toBe('function');
    expect(typeof state.resetUpload).toBe('function');
    expect(typeof state.setGeneratedImage).toBe('function');
    expect(typeof state.setGallerySaved).toBe('function');
    expect(typeof state.setPortraitName).toBe('function');
    expect(typeof state.clearPortraitName).toBe('function');
    expect(typeof state.setTextOverlaySettings).toBe('function');
    expect(typeof state.updateTextOverlaySettings).toBe('function');
    expect(typeof state.resetTextOverlaySettings).toBe('function');
    expect(typeof state.openSidebar).toBe('function');
    expect(typeof state.closeSidebar).toBe('function');
    expect(typeof state.toggleSidebar).toBe('function');
    expect(typeof state.setCurrentStep).toBe('function');
    expect(typeof state.setGiftOptions).toBe('function');
    expect(typeof state.clearGiftOptions).toBe('function');
  });
});
