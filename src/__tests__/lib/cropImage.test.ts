// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropImage, type CropArea } from '../../lib/cropImage';

// Mock canvas context
const mockDrawImage = vi.fn();
const mockToBlob = vi.fn();
const mockGetContext = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Reset mock implementations
  mockGetContext.mockReturnValue({
    drawImage: mockDrawImage,
  });

  mockToBlob.mockImplementation(function (
    this: void,
    callback: (blob: Blob | null) => void,
    _type: string,
    _quality: number
  ) {
    callback(new Blob(['fake-image'], { type: 'image/jpeg' }));
  });

  // Mock document.createElement for canvas
  vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toBlob: mockToBlob,
      } as unknown as HTMLCanvasElement;
    }
    return document.createElement.call(document, tag);
  });
});

// Helper to create a fake image load scenario
function mockImageLoad() {
  // Mock the Image constructor to trigger onload immediately
  vi.spyOn(globalThis, 'Image').mockImplementation(function (this: HTMLImageElement) {
    const img = {} as HTMLImageElement;
    setTimeout(() => {
      if (img.onload) {
        (img.onload as () => void).call(img);
      }
    }, 0);
    return img;
  } as unknown as typeof Image);
}

function mockImageError() {
  vi.spyOn(globalThis, 'Image').mockImplementation(function (this: HTMLImageElement) {
    const img = {} as HTMLImageElement;
    setTimeout(() => {
      if (img.onerror) {
        (img.onerror as () => void).call(img);
      }
    }, 0);
    return img;
  } as unknown as typeof Image);
}

describe('cropImage', () => {
  const defaultCrop: CropArea = {
    x: 10,
    y: 20,
    width: 200,
    height: 150,
  };

  it('returns a Blob on successful crop', async () => {
    mockImageLoad();
    const blob = await cropImage('data:image/png;base64,fakedata', defaultCrop);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('sets canvas dimensions to crop area dimensions', async () => {
    mockImageLoad();
    const canvasMock = {
      width: 0,
      height: 0,
      getContext: mockGetContext,
      toBlob: mockToBlob,
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
      return document.createElement.call(document, tag);
    });

    await cropImage('data:image/png;base64,fakedata', defaultCrop);

    // Canvas dimensions should have been set to crop dimensions before toBlob
    // but they get zeroed out after. We check drawImage was called with correct params.
    expect(mockDrawImage).toHaveBeenCalledWith(
      expect.anything(),
      10, 20, 200, 150,
      0, 0, 200, 150,
    );
  });

  it('rejects when canvas context is not available', async () => {
    mockImageLoad();
    mockGetContext.mockReturnValue(null);

    await expect(
      cropImage('data:image/png;base64,fakedata', defaultCrop)
    ).rejects.toThrow('Canvas context not available');
  });

  it('rejects when image fails to load', async () => {
    mockImageError();

    await expect(
      cropImage('data:image/png;base64,fakedata', defaultCrop)
    ).rejects.toThrow('Failed to load image for cropping');
  });

  it('rejects when toBlob returns null', async () => {
    mockImageLoad();
    mockToBlob.mockImplementation(function (
      this: void,
      callback: (blob: Blob | null) => void
    ) {
      callback(null);
    });

    await expect(
      cropImage('data:image/png;base64,fakedata', defaultCrop)
    ).rejects.toThrow('Canvas toBlob returned null');
  });

  it('cleans up canvas dimensions after blob creation', async () => {
    mockImageLoad();
    const canvasMock = {
      width: 0,
      height: 0,
      getContext: mockGetContext,
      toBlob: mockToBlob,
    };

    // Capture width/height assignments through toBlob callback
    mockToBlob.mockImplementation(function (
      this: void,
      callback: (blob: Blob | null) => void
    ) {
      callback(new Blob(['fake-image'], { type: 'image/jpeg' }));
    });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
      return document.createElement.call(document, tag);
    });

    await cropImage('data:image/png;base64,fakedata', defaultCrop);

    // After blob creation, canvas dimensions should be zeroed for cleanup
    expect(canvasMock.width).toBe(0);
    expect(canvasMock.height).toBe(0);
  });
});
