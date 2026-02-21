/**
 * Unit tests for watermark library
 * Tests parseBase64DataUrl, bufferToDataUrl, and applyWatermark
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (before imports) ────────────────────────────

const mockMetadata = vi.fn();
const mockComposite = vi.fn();
const mockToFormat = vi.fn();
const mockToBuffer = vi.fn();

vi.mock('sharp', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      metadata: mockMetadata,
      composite: mockComposite,
      toFormat: mockToFormat,
      toBuffer: mockToBuffer,
    };
  }),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ── Imports ───────────────────────────────────────────

import { parseBase64DataUrl, bufferToDataUrl, applyWatermark } from '../../lib/watermark.js';
import { logger } from '../../lib/logger.js';

// ── Tests ─────────────────────────────────────────────

describe('Watermark Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-set mock return values after clearAllMocks
    const fakeResult = Buffer.from('watermarked-image');
    mockMetadata.mockResolvedValue({ width: 800, height: 600 });
    mockComposite.mockReturnValue({ toFormat: mockToFormat });
    mockToFormat.mockReturnValue({ toBuffer: mockToBuffer });
    mockToBuffer.mockResolvedValue(fakeResult);
  });

  // ─── parseBase64DataUrl ──────────────────────────

  describe('parseBase64DataUrl', () => {
    it('should parse a valid PNG data URL', () => {
      const base64Data = Buffer.from('fake-png-data').toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      const result = parseBase64DataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/png');
      expect(result!.buffer).toEqual(Buffer.from('fake-png-data'));
    });

    it('should parse a valid JPEG data URL', () => {
      const base64Data = Buffer.from('fake-jpeg-data').toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;

      const result = parseBase64DataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/jpeg');
      expect(result!.buffer).toEqual(Buffer.from('fake-jpeg-data'));
    });

    it('should parse a valid WEBP data URL', () => {
      const base64Data = Buffer.from('fake-webp-data').toString('base64');
      const dataUrl = `data:image/webp;base64,${base64Data}`;

      const result = parseBase64DataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/webp');
    });

    it('should return null for non-data-URL strings', () => {
      expect(parseBase64DataUrl('https://example.com/image.png')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseBase64DataUrl('')).toBeNull();
    });

    it('should return null for data URL without base64 encoding', () => {
      expect(parseBase64DataUrl('data:image/png,rawdata')).toBeNull();
    });

    it('should return null for non-image MIME types', () => {
      const base64Data = Buffer.from('text-data').toString('base64');
      expect(parseBase64DataUrl(`data:text/plain;base64,${base64Data}`)).toBeNull();
    });

    it('should handle case-insensitive MIME type matching', () => {
      const base64Data = Buffer.from('data').toString('base64');
      const result = parseBase64DataUrl(`data:image/PNG;base64,${base64Data}`);

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/PNG');
    });
  });

  // ─── bufferToDataUrl ──────────────────────────

  describe('bufferToDataUrl', () => {
    it('should convert buffer to PNG data URL', () => {
      const buffer = Buffer.from('fake-data');
      const result = bufferToDataUrl(buffer, 'image/png');

      expect(result).toBe(`data:image/png;base64,${buffer.toString('base64')}`);
    });

    it('should convert buffer to JPEG data URL', () => {
      const buffer = Buffer.from('jpeg-data');
      const result = bufferToDataUrl(buffer, 'image/jpeg');

      expect(result).toBe(`data:image/jpeg;base64,${buffer.toString('base64')}`);
    });

    it('should roundtrip with parseBase64DataUrl', () => {
      const originalBuffer = Buffer.from('roundtrip-test-data');
      const dataUrl = bufferToDataUrl(originalBuffer, 'image/png');
      const parsed = parseBase64DataUrl(dataUrl);

      expect(parsed).not.toBeNull();
      expect(parsed!.mimeType).toBe('image/png');
      expect(parsed!.buffer).toEqual(originalBuffer);
    });
  });

  // ─── applyWatermark ──────────────────────────

  describe('applyWatermark', () => {
    it('should return watermarked buffer for valid input', async () => {
      const inputBuffer = Buffer.from('test-image');
      const result = await applyWatermark(inputBuffer, 'image/png');

      expect(result).not.toBeNull();
      expect(result).toEqual(Buffer.from('watermarked-image'));
    });

    it('should use PNG format for image/png MIME type', async () => {
      const inputBuffer = Buffer.from('test-image');
      await applyWatermark(inputBuffer, 'image/png');

      expect(mockToFormat).toHaveBeenCalledWith('png', {});
    });

    it('should use JPEG format with quality 92 for non-PNG MIME types', async () => {
      const inputBuffer = Buffer.from('test-image');
      await applyWatermark(inputBuffer, 'image/jpeg');

      expect(mockToFormat).toHaveBeenCalledWith('jpeg', { quality: 92 });
    });

    it('should use default dimensions when metadata has no width/height', async () => {
      mockMetadata.mockResolvedValue({});

      const inputBuffer = Buffer.from('test-image');
      const result = await applyWatermark(inputBuffer, 'image/png');

      // Should still succeed with default 1024x1024
      expect(result).not.toBeNull();
    });

    it('should accept custom watermark options', async () => {
      const inputBuffer = Buffer.from('test-image');
      const result = await applyWatermark(inputBuffer, 'image/png', {
        text: 'CUSTOM',
        opacity: 0.5,
        rotation: -45,
        fontSizeRatio: 0.05,
      });

      expect(result).not.toBeNull();
    });

    it('should return null when sharp throws an error', async () => {
      mockMetadata.mockRejectedValue(new Error('Invalid image'));

      const inputBuffer = Buffer.from('bad-image');
      const result = await applyWatermark(inputBuffer, 'image/png');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply watermark',
        expect.objectContaining({ error: 'Invalid image' }),
      );
    });

    it('should return null when composite fails', async () => {
      mockComposite.mockImplementation(() => {
        throw new Error('Composite failed');
      });

      const inputBuffer = Buffer.from('test-image');
      const result = await applyWatermark(inputBuffer, 'image/png');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply watermark',
        expect.objectContaining({ error: 'Composite failed' }),
      );
    });

    it('should log non-Error objects as string', async () => {
      mockMetadata.mockRejectedValue('string-error');

      const inputBuffer = Buffer.from('bad-image');
      const result = await applyWatermark(inputBuffer, 'image/png');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to apply watermark',
        expect.objectContaining({ error: 'string-error' }),
      );
    });

    it('should call composite with SVG buffer overlay', async () => {
      const inputBuffer = Buffer.from('test-image');
      await applyWatermark(inputBuffer, 'image/png');

      expect(mockComposite).toHaveBeenCalledWith([
        expect.objectContaining({
          input: expect.any(Buffer),
          top: 0,
          left: 0,
        }),
      ]);
    });
  });
});
