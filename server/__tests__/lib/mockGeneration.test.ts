/**
 * Unit tests for mock generation library
 * Tests generateMockResponse and its helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Imports ───────────────────────────────────────────

import { generateMockResponse } from '../../lib/mockGeneration.js';

// ── Tests ─────────────────────────────────────────────

describe('Mock Generation Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMockResponse', () => {
    it('should return a successful response', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.success).toBe(true);
    });

    it('should return a valid projectId', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.projectId).toBeTruthy();
      expect(result.projectId).toMatch(/^proj_/);
    });

    it('should return a base64 SVG data URL for generatedImage', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.generatedImage).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should return the same value for generatedImage and thumbnailImage', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.thumbnailImage).toBe(result.generatedImage);
    });

    it('should mark response as watermarked', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.watermarked).toBe(true);
    });

    it('should report 1 credit used', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.creditsUsed).toBe(1);
    });

    it('should report 4 credits remaining', async () => {
      const result = await generateMockResponse('baroque');

      expect(result.creditsRemaining).toBe(4);
    });

    it('should generate unique projectIds for different calls', async () => {
      const result1 = await generateMockResponse('baroque');
      const result2 = await generateMockResponse('baroque');

      expect(result1.projectId).not.toBe(result2.projectId);
    });

    it('should include the style ID in the SVG', async () => {
      const result = await generateMockResponse('anime');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).toContain('anime');
    });

    it('should include a title for known style IDs', async () => {
      const result = await generateMockResponse('ghibli');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).toContain('Nostalgic Animation Portrait');
    });

    it('should use default title for unknown style IDs', async () => {
      const result = await generateMockResponse('nonexistent');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).toContain('Stylized Portrait');
    });

    it('should use default colors for unknown style IDs', async () => {
      const result = await generateMockResponse('nonexistent');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      // Default colors include #262626
      expect(decodedSvg).toContain('#262626');
    });

    it('should use baroque-specific colors for baroque style', async () => {
      const result = await generateMockResponse('baroque');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).toContain('#2F1810');
    });

    it('should sanitize style ID to prevent injection', async () => {
      const result = await generateMockResponse('<script>alert("xss")</script>');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).not.toContain('<script>');
      expect(decodedSvg).toContain('scriptalertxssscript');
    });

    it('should truncate long style IDs to 50 characters', async () => {
      const longStyleId = 'a'.repeat(100);
      const result = await generateMockResponse(longStyleId);
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      // The safe version should be max 50 chars
      expect(decodedSvg).toContain('a'.repeat(50));
      expect(decodedSvg).not.toContain('a'.repeat(51));
    });

    it('should generate valid SVG markup', async () => {
      const result = await generateMockResponse('watercolor');
      const decodedSvg = Buffer.from(
        result.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      expect(decodedSvg).toContain('<svg');
      expect(decodedSvg).toContain('</svg>');
      expect(decodedSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should return different style-specific colors for different styles', async () => {
      const baroqueResult = await generateMockResponse('baroque');
      const animeResult = await generateMockResponse('anime');

      const baroqueSvg = Buffer.from(
        baroqueResult.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');
      const animeSvg = Buffer.from(
        animeResult.generatedImage.replace('data:image/svg+xml;base64,', ''),
        'base64',
      ).toString('utf-8');

      // Baroque has dark warm tones, anime has pink
      expect(baroqueSvg).toContain('#2F1810');
      expect(animeSvg).toContain('#FF6B9D');
    });
  });
});
