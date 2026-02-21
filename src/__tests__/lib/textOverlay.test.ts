// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the portraitFonts module
vi.mock('../../data/portraitFonts', () => ({
  getPortraitFont: vi.fn(),
  defaultPortraitFont: {
    fontFamily: 'Noto Sans JP',
    fontWeight: 'bold',
    color: '#FFFFFF',
    stroke: { width: 3, color: '#000000' },
    shadow: { blur: 5, offsetX: 2, offsetY: 2, color: 'rgba(0, 0, 0, 0.7)' },
  },
  portraitFonts: {},
}));

import { applyTextOverlay, waitForFontLoad, waitForFontsLoad } from '../../lib/textOverlay';
import type { TextOverlayOptions } from '../../lib/textOverlay';
import { getPortraitFont } from '../../data/portraitFonts';

const mockGetPortraitFont = vi.mocked(getPortraitFont);

// Canvas context mocks
const mockFillText = vi.fn();
const mockStrokeText = vi.fn();
const mockSave = vi.fn();
const mockRestore = vi.fn();
const mockDrawImage = vi.fn();
const mockToDataURL = vi.fn();

const mockCtx = {
  drawImage: mockDrawImage,
  fillText: mockFillText,
  strokeText: mockStrokeText,
  save: mockSave,
  restore: mockRestore,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textBaseline: '',
  textAlign: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowColor: '',
};

beforeEach(() => {
  vi.clearAllMocks();

  mockGetPortraitFont.mockReturnValue({
    fontFamily: 'EB Garamond',
    fontWeight: 600,
    color: '#2F2F2F',
    shadow: { blur: 4, offsetX: 1, offsetY: 1, color: 'rgba(0, 0, 0, 0.5)' },
  });

  mockToDataURL.mockReturnValue('data:image/jpeg;base64,result');

  vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => mockCtx,
        toDataURL: mockToDataURL,
      } as unknown as HTMLCanvasElement;
    }
    return document.createElement.call(document, tag);
  });
});

function mockImageLoad(width = 800, height = 600) {
  vi.spyOn(globalThis, 'Image').mockImplementation(function (this: HTMLImageElement) {
    const img = { width, height, crossOrigin: '' } as HTMLImageElement;
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
    const img = { crossOrigin: '' } as HTMLImageElement;
    setTimeout(() => {
      if (img.onerror) {
        (img.onerror as () => void).call(img);
      }
    }, 0);
    return img;
  } as unknown as typeof Image);
}

const defaultOptions: TextOverlayOptions = {
  text: 'TestName',
  styleId: 'renaissance',
  imageWidth: 800,
  imageHeight: 600,
};

describe('applyTextOverlay', () => {
  it('returns the original image when text is empty', async () => {
    const baseUrl = 'data:image/jpeg;base64,original';
    const result = await applyTextOverlay(baseUrl, { ...defaultOptions, text: '' });
    expect(result).toBe(baseUrl);
  });

  it('returns the original image when text is only whitespace', async () => {
    const baseUrl = 'data:image/jpeg;base64,original';
    const result = await applyTextOverlay(baseUrl, { ...defaultOptions, text: '   ' });
    expect(result).toBe(baseUrl);
  });

  it('applies text overlay and returns a new data URL', async () => {
    mockImageLoad();
    const result = await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    expect(result).toBe('data:image/jpeg;base64,result');
  });

  it('draws the base image onto canvas', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    expect(mockDrawImage).toHaveBeenCalled();
  });

  it('calls getPortraitFont with the styleId', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    expect(mockGetPortraitFont).toHaveBeenCalledWith('renaissance');
  });

  it('renders text with fillText', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    // fillText should be called at least once for the main text
    expect(mockFillText).toHaveBeenCalled();
  });

  it('renders shadow when font config has shadow', async () => {
    mockImageLoad();
    mockGetPortraitFont.mockReturnValue({
      fontFamily: 'EB Garamond',
      fontWeight: 600,
      color: '#2F2F2F',
      shadow: { blur: 4, offsetX: 1, offsetY: 1, color: 'rgba(0, 0, 0, 0.5)' },
    });

    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    // save/restore should be called for shadow
    expect(mockSave).toHaveBeenCalled();
    expect(mockRestore).toHaveBeenCalled();
  });

  it('renders stroke when font config has stroke', async () => {
    mockImageLoad();
    mockGetPortraitFont.mockReturnValue({
      fontFamily: 'Noto Sans JP',
      fontWeight: 'bold',
      color: '#FFFFFF',
      stroke: { width: 3, color: '#000000' },
    });

    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    expect(mockStrokeText).toHaveBeenCalled();
  });

  it('renders glow when font config has glow', async () => {
    mockImageLoad();
    mockGetPortraitFont.mockReturnValue({
      fontFamily: 'Pacifico',
      fontWeight: 'normal',
      color: '#FFD700',
      glow: { color: 'rgba(255, 182, 193, 0.8)', blur: 15 },
    });

    await applyTextOverlay('data:image/jpeg;base64,original', defaultOptions);
    // glow causes an extra fillText via save/restore
    expect(mockSave).toHaveBeenCalled();
    expect(mockRestore).toHaveBeenCalled();
    expect(mockFillText).toHaveBeenCalled();
  });

  it('uses custom font when provided', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', {
      ...defaultOptions,
      customFont: { fontFamily: 'CustomFont', fontWeight: 'bold' },
    });
    // Font should include CustomFont
    expect(mockCtx.font).toContain('CustomFont');
  });

  it('uses custom decoration when provided', async () => {
    mockImageLoad();
    const customDecoration = {
      color: '#FF0000',
      stroke: { width: 5, color: '#00FF00' },
    };
    await applyTextOverlay('data:image/jpeg;base64,original', {
      ...defaultOptions,
      customDecoration,
    });
    expect(mockStrokeText).toHaveBeenCalled();
  });

  it('rejects when canvas context is not available', async () => {
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement.call(document, tag);
    });

    await expect(
      applyTextOverlay('data:image/jpeg;base64,original', defaultOptions)
    ).rejects.toThrow('Canvas context not available');
  });

  it('rejects when base image fails to load', async () => {
    mockImageError();
    await expect(
      applyTextOverlay('data:image/jpeg;base64,original', defaultOptions)
    ).rejects.toThrow('Failed to load base image');
  });

  it('uses bottom-center position by default', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', {
      ...defaultOptions,
      position: undefined,
    });
    expect(mockCtx.textAlign).toBe('center');
  });

  it('supports top-left position', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', {
      ...defaultOptions,
      position: 'top-left',
    });
    expect(mockCtx.textAlign).toBe('left');
  });

  it('supports bottom-right position', async () => {
    mockImageLoad();
    await applyTextOverlay('data:image/jpeg;base64,original', {
      ...defaultOptions,
      position: 'bottom-right',
    });
    expect(mockCtx.textAlign).toBe('right');
  });
});

describe('waitForFontLoad', () => {
  it('returns true when fonts API is not available', async () => {
    const originalFonts = document.fonts;
    Object.defineProperty(document, 'fonts', { value: undefined, configurable: true });

    const result = await waitForFontLoad('TestFont');
    expect(result).toBe(true);

    Object.defineProperty(document, 'fonts', { value: originalFonts, configurable: true });
  });

  it('returns true when font loads successfully', async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      value: { load: mockLoad },
      configurable: true,
    });

    const result = await waitForFontLoad('TestFont');
    expect(result).toBe(true);
    expect(mockLoad).toHaveBeenCalledWith('16px "TestFont"');
  });

  it('returns false when font load times out', async () => {
    vi.useFakeTimers();
    const mockLoad = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    Object.defineProperty(document, 'fonts', {
      value: { load: mockLoad },
      configurable: true,
    });

    const promise = waitForFontLoad('TestFont', 100);

    // Advance timers past the timeout
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe(false);

    vi.useRealTimers();
  });
});

describe('waitForFontsLoad', () => {
  it('waits for all fonts to load', async () => {
    const mockLoad = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      value: { load: mockLoad },
      configurable: true,
    });

    await waitForFontsLoad(['Font1', 'Font2', 'Font3']);
    expect(mockLoad).toHaveBeenCalledTimes(3);
  });
});
