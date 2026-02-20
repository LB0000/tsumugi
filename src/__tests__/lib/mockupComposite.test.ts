import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasMockupConfig, compositeOnMockup } from '../../lib/mockupComposite';

// --- Canvas / Image mocks ---

const mockDrawImage = vi.fn();
const mockSave = vi.fn();
const mockRestore = vi.fn();
const mockBeginPath = vi.fn();
const mockRect = vi.fn();
const mockClip = vi.fn();
const mockStrokeRect = vi.fn();
const mockToDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
const mockGetContext = vi.fn(() => ({
  drawImage: mockDrawImage,
  save: mockSave,
  restore: mockRestore,
  beginPath: mockBeginPath,
  rect: mockRect,
  clip: mockClip,
  strokeRect: mockStrokeRect,
  strokeStyle: '',
  lineWidth: 0,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockDrawImage.mockClear();
  mockSave.mockClear();
  mockRestore.mockClear();
  mockBeginPath.mockClear();
  mockRect.mockClear();
  mockClip.mockClear();
  mockStrokeRect.mockClear();
  mockToDataURL.mockClear();
  mockGetContext.mockClear();

  // Mock document.createElement for canvas
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: mockGetContext,
        toDataURL: mockToDataURL,
      } as unknown as HTMLCanvasElement;
    }
    return document.createElement(tag);
  });

  // Mock Image constructor to auto-resolve onload
  vi.stubGlobal(
    'Image',
    class MockImage {
      width = 800;
      height = 600;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        // Auto-trigger onload after microtask (simulate async load)
        if (value && this.onload) {
          Promise.resolve().then(() => this.onload?.());
        }
      }
    },
  );
});

// --- hasMockupConfig ---

describe('hasMockupConfig', () => {
  it('returns true for acrylic-stand', () => {
    expect(hasMockupConfig('acrylic-stand')).toBe(true);
  });

  it('returns true for canvas', () => {
    expect(hasMockupConfig('canvas')).toBe(true);
  });

  it('returns false for unknown product', () => {
    expect(hasMockupConfig('download')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasMockupConfig('')).toBe(false);
  });
});

// --- compositeOnMockup ---

describe('compositeOnMockup', () => {
  it('returns null for unknown productId', async () => {
    const result = await compositeOnMockup('data:image/png;base64,abc', 'unknown-product');
    expect(result).toBeNull();
  });

  it('returns a data URL for a valid product', async () => {
    const result = await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand');
    expect(result).toBe('data:image/jpeg;base64,mock');
  });

  it('draws mockup background first, then clips portrait on top', async () => {
    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand');

    // drawImage called twice: mockup background then clipped portrait
    expect(mockDrawImage).toHaveBeenCalledTimes(2);

    // First call: mockup template at 0,0 (background)
    const [, firstX, firstY] = mockDrawImage.mock.calls[0];
    expect(firstX).toBe(0);
    expect(firstY).toBe(0);

    // Second call: portrait at calculated region (clipped)
    const [secondCallImg] = mockDrawImage.mock.calls[1];
    expect(secondCallImg).toBeDefined();

    // Verify clipping was applied between the two draws
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockBeginPath).toHaveBeenCalledTimes(1);
    expect(mockClip).toHaveBeenCalledTimes(1);
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it('outputs JPEG with 0.85 quality', async () => {
    await compositeOnMockup('data:image/png;base64,abc', 'canvas');
    expect(mockToDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);
  });

  it('releases canvas buffer after compositing', async () => {
    const canvasEl = { width: 0, height: 0, getContext: mockGetContext, toDataURL: mockToDataURL };
    vi.spyOn(document, 'createElement').mockReturnValue(canvasEl as unknown as HTMLCanvasElement);

    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand');

    // Canvas dimensions should be zeroed for GPU memory release
    expect(canvasEl.width).toBe(0);
    expect(canvasEl.height).toBe(0);
  });

  it('does not set crossOrigin for data URLs', async () => {
    // Track crossOrigin at the time src is set (before compositeOnMockup clears src)
    const srcToCrossOrigin = new Map<string, string>();
    vi.stubGlobal(
      'Image',
      class MockImage {
        width = 800;
        height = 600;
        crossOrigin = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        get src() {
          return this._src;
        }
        set src(value: string) {
          this._src = value;
          if (value) {
            srcToCrossOrigin.set(value, this.crossOrigin);
            Promise.resolve().then(() => this.onload?.());
          }
        }
      },
    );

    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand');

    // The portrait image (data URL) should not have crossOrigin set
    expect(srcToCrossOrigin.get('data:image/png;base64,abc')).toBe('');

    // The mockup template (path URL) should have crossOrigin set
    expect(srcToCrossOrigin.get('/images/mock-up/acrylic-stand.png')).toBe('anonymous');
  });

  it('rejects when image fails to load', async () => {
    vi.stubGlobal(
      'Image',
      class FailImage {
        width = 0;
        height = 0;
        crossOrigin = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        get src() {
          return this._src;
        }
        set src(value: string) {
          this._src = value;
          if (value && this.onerror) {
            Promise.resolve().then(() => this.onerror?.());
          }
        }
      },
    );

    await expect(
      compositeOnMockup('https://example.com/broken.png', 'acrylic-stand'),
    ).rejects.toThrow('Failed to load image');
  });

  it('throws when canvas context is unavailable', async () => {
    mockGetContext.mockReturnValueOnce(null);

    await expect(
      compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand'),
    ).rejects.toThrow('Canvas context not available');
  });

  // --- A: アスペクト比保持 ---

  it('preserves portrait aspect ratio within region (landscape image)', async () => {
    // Mock: portrait = 800x600 (横長), mockup = 800x600
    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand');

    // acrylic-stand region: x=0.255, y=0.095, w=0.49, h=0.645
    // canvas=800x600 → rw=392, rh=387
    // imgAspect=800/600≈1.33, regionAspect=392/387≈1.01
    // imgAspect > regionAspect → fit to width: drawW=392, drawH=392/1.33≈294
    const portraitDraw = mockDrawImage.mock.calls[1];
    const [, drawX, drawY, drawW, drawH] = portraitDraw;

    // Width should match region width (fit to width)
    expect(drawW).toBe(Math.round(0.49 * 800));
    // Height should be less than region height (aspect ratio preserved)
    expect(drawH).toBeLessThan(Math.round(0.645 * 600));
    // Vertically centered within region
    const ry = Math.round(0.095 * 600);
    const rh = Math.round(0.645 * 600);
    const expectedY = ry + (rh - drawH) / 2;
    expect(drawY).toBeCloseTo(expectedY, 0);
    // X stays at region start
    expect(drawX).toBe(Math.round(0.255 * 800));
  });

  it('preserves portrait aspect ratio within region (tall image)', async () => {
    // Override mock: portrait = 400x800 (縦長)
    vi.stubGlobal(
      'Image',
      class TallImage {
        width = 400;
        height = 800;
        crossOrigin = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        get src() { return this._src; }
        set src(value: string) {
          this._src = value;
          if (value && this.onload) {
            Promise.resolve().then(() => this.onload?.());
          }
        }
      },
    );

    await compositeOnMockup('data:image/png;base64,abc', 'canvas');

    // canvas region: x=0.215, y=0.04, w=0.57, h=0.72
    // mockup=400x800 → rw=228, rh=576
    // imgAspect=400/800=0.5, regionAspect=228/576≈0.396
    // imgAspect > regionAspect → fit to width
    const portraitDraw = mockDrawImage.mock.calls[1];
    const [, , , drawW, drawH] = portraitDraw;
    expect(drawW).toBe(Math.round(0.57 * 400));
    expect(drawH).toBeLessThan(Math.round(0.72 * 800));
  });

  // --- B: maxSize による出力サイズ最適化 ---

  it('scales canvas down when maxSize is specified', async () => {
    const canvasEl = { width: 0, height: 0, getContext: mockGetContext, toDataURL: mockToDataURL };
    vi.spyOn(document, 'createElement').mockReturnValue(canvasEl as unknown as HTMLCanvasElement);

    // mockup image = 800x600, maxSize = 400
    // scale = min(1, 400/800) = 0.5 → canvas = 400x300
    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand', { maxSize: 400 });

    // Canvas was set to scaled size before toDataURL (now zeroed after cleanup)
    // Verify drawImage first call uses scaled dimensions
    const [, bgX, bgY, bgW, bgH] = mockDrawImage.mock.calls[0];
    expect(bgX).toBe(0);
    expect(bgY).toBe(0);
    expect(bgW).toBe(400);
    expect(bgH).toBe(300);
  });

  it('does not upscale when maxSize exceeds image dimensions', async () => {
    const canvasEl = { width: 0, height: 0, getContext: mockGetContext, toDataURL: mockToDataURL };
    vi.spyOn(document, 'createElement').mockReturnValue(canvasEl as unknown as HTMLCanvasElement);

    // mockup = 800x600, maxSize = 2000 → scale = min(1, 2000/800) = 1
    await compositeOnMockup('data:image/png;base64,abc', 'acrylic-stand', { maxSize: 2000 });

    const [, bgX, bgY, bgW, bgH] = mockDrawImage.mock.calls[0];
    expect(bgX).toBe(0);
    expect(bgY).toBe(0);
    expect(bgW).toBe(800);
    expect(bgH).toBe(600);
  });
});
