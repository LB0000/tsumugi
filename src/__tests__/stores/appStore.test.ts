import { useAppStore } from '../../stores/appStore';

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    uploadState: {
      status: 'idle',
      progress: 0,
      previewUrl: null,
      errorMessage: null,
      rawFile: null,
      croppedFile: null,
      croppedPreviewUrl: null,
    },
    generatedImage: null,
    currentStep: 'upload',
  });
});

describe('resetUpload', () => {
  it('resets upload state, generatedImage, and currentStep', () => {
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
      currentStep: 'download',
    });

    useAppStore.getState().resetUpload();

    const state = useAppStore.getState();
    expect(state.uploadState).toEqual({
      status: 'idle',
      progress: 0,
      previewUrl: null,
      errorMessage: null,
      rawFile: null,
      croppedFile: null,
      croppedPreviewUrl: null,
    });
    expect(state.generatedImage).toBeNull();
    expect(state.currentStep).toBe('upload');
  });
});
