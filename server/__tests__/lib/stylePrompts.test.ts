/**
 * Unit tests for style prompts library
 * Tests validStyleIds, getStylePrompt, getStyleFocusPrompt, categoryPrompts, and styleNameMap
 */

import { describe, it, expect } from 'vitest';

// ── Imports ───────────────────────────────────────────

import {
  validStyleIds,
  getStylePrompt,
  getStyleFocusPrompt,
  categoryPrompts,
} from '../../lib/stylePrompts.js';
import { styleNameMap } from '../../lib/stylePrompts.js';

// ── Tests ─────────────────────────────────────────────

describe('Style Prompts Library', () => {
  // ─── validStyleIds ──────────────────────────

  describe('validStyleIds', () => {
    it('should be a Set', () => {
      expect(validStyleIds).toBeInstanceOf(Set);
    });

    it('should contain standard art styles', () => {
      expect(validStyleIds.has('baroque')).toBe(true);
      expect(validStyleIds.has('renaissance')).toBe(true);
      expect(validStyleIds.has('impressionist')).toBe(true);
      expect(validStyleIds.has('watercolor')).toBe(true);
      expect(validStyleIds.has('ukiyo-e')).toBe(true);
      expect(validStyleIds.has('sumi-e')).toBe(true);
      expect(validStyleIds.has('anime')).toBe(true);
      expect(validStyleIds.has('ghibli')).toBe(true);
      expect(validStyleIds.has('pop-art')).toBe(true);
      expect(validStyleIds.has('hand-drawn')).toBe(true);
      expect(validStyleIds.has('pixel-art')).toBe(true);
      expect(validStyleIds.has('vector')).toBe(true);
    });

    it('should contain pet-specific styles', () => {
      expect(validStyleIds.has('pet-royalty')).toBe(true);
      expect(validStyleIds.has('pet-samurai')).toBe(true);
      expect(validStyleIds.has('pet-fairy')).toBe(true);
    });

    it('should contain kids-specific styles', () => {
      expect(validStyleIds.has('kids-princess')).toBe(true);
    });

    it('should contain stained-glass and art-nouveau', () => {
      expect(validStyleIds.has('stained-glass')).toBe(true);
      expect(validStyleIds.has('art-nouveau')).toBe(true);
    });

    it('should not contain invalid style IDs', () => {
      expect(validStyleIds.has('nonexistent')).toBe(false);
      expect(validStyleIds.has('')).toBe(false);
    });
  });

  // ─── styleNameMap ──────────────────────────

  describe('styleNameMap', () => {
    it('should map baroque to Japanese name', () => {
      expect(styleNameMap['baroque']).toBe('バロック');
    });

    it('should map renaissance to Japanese name', () => {
      expect(styleNameMap['renaissance']).toBe('ルネサンス');
    });

    it('should map anime to Japanese name', () => {
      expect(styleNameMap['anime']).toBe('アニメ');
    });

    it('should map ghibli to Japanese name', () => {
      expect(styleNameMap['ghibli']).toBe('ジブリ風');
    });

    it('should map ukiyo-e to Japanese name', () => {
      expect(styleNameMap['ukiyo-e']).toBe('浮世絵');
    });

    it('should map pet-royalty to Japanese name', () => {
      expect(styleNameMap['pet-royalty']).toBe('ロイヤル');
    });

    it('should return undefined for non-existent styles', () => {
      expect(styleNameMap['nonexistent']).toBeUndefined();
    });
  });

  // ─── getStylePrompt ──────────────────────────

  describe('getStylePrompt', () => {
    it('should return a prompt for standard art styles', () => {
      const prompt = getStylePrompt('baroque', 'family');

      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(50);
      expect(prompt).toContain('Baroque');
    });

    it('should return a prompt for renaissance style', () => {
      const prompt = getStylePrompt('renaissance', 'family');

      expect(prompt).toContain('Renaissance');
    });

    it('should return a prompt for impressionist style', () => {
      const prompt = getStylePrompt('impressionist', 'family');

      expect(prompt).toContain('Impressionist');
    });

    it('should return pet-specific prompt for pet-royalty with pets category', () => {
      const prompt = getStylePrompt('pet-royalty', 'pets');

      expect(prompt).toContain('pet');
      expect(prompt).toContain('royal');
    });

    it('should return human-specific prompt for pet-royalty with non-pets category', () => {
      const prompt = getStylePrompt('pet-royalty', 'family');

      expect(prompt).toContain('portrait');
      expect(prompt).not.toContain('pet photo');
    });

    it('should return pet-specific prompt for pet-samurai with pets category', () => {
      const prompt = getStylePrompt('pet-samurai', 'pets');

      expect(prompt).toContain('pet');
      expect(prompt).toContain('samurai');
    });

    it('should return human-specific prompt for pet-samurai with non-pets category', () => {
      const prompt = getStylePrompt('pet-samurai', 'family');

      expect(prompt).not.toContain('pet photo');
      expect(prompt).toContain('samurai');
    });

    it('should return pet-specific prompt for pet-fairy with pets category', () => {
      const prompt = getStylePrompt('pet-fairy', 'pets');

      expect(prompt).toContain('pet');
      expect(prompt).toContain('fairy');
    });

    it('should return human-specific prompt for pet-fairy with non-pets category', () => {
      const prompt = getStylePrompt('pet-fairy', 'family');

      expect(prompt).not.toContain('pet photo');
    });

    it('should return kids-princess prompt for any category', () => {
      const promptPets = getStylePrompt('kids-princess', 'pets');
      const promptFamily = getStylePrompt('kids-princess', 'family');

      // kids-princess ignores isPet parameter, returns same prompt
      expect(promptPets).toBe(promptFamily);
      expect(promptPets).toContain('princess');
    });

    it('should fall back to baroque for unknown style IDs', () => {
      const prompt = getStylePrompt('nonexistent-style', 'family');
      const baroquePrompt = getStylePrompt('baroque', 'family');

      expect(prompt).toBe(baroquePrompt);
    });

    it('should return different prompts for different styles', () => {
      const baroque = getStylePrompt('baroque', 'family');
      const anime = getStylePrompt('anime', 'family');

      expect(baroque).not.toBe(anime);
    });
  });

  // ─── getStyleFocusPrompt ──────────────────────────

  describe('getStyleFocusPrompt', () => {
    it('should return focus prompt for ghibli style', () => {
      const prompt = getStyleFocusPrompt('ghibli');

      expect(prompt).toBeTruthy();
      expect(prompt).toContain('STYLE LOCK');
      expect(prompt).toContain('HAND-PAINTED');
    });

    it('should return empty string for styles without focus prompt', () => {
      const prompt = getStyleFocusPrompt('baroque');

      expect(prompt).toBe('');
    });

    it('should return empty string for unknown style IDs', () => {
      const prompt = getStyleFocusPrompt('nonexistent-style');

      expect(prompt).toBe('');
    });

    it('should contain background/character duality guidance for ghibli', () => {
      const prompt = getStyleFocusPrompt('ghibli');

      expect(prompt).toContain('BACKGROUND');
      expect(prompt).toContain('CHARACTER');
    });

    it('should contain eye guidance for ghibli', () => {
      const prompt = getStyleFocusPrompt('ghibli');

      expect(prompt).toContain('EYES');
    });
  });

  // ─── categoryPrompts ──────────────────────────

  describe('categoryPrompts', () => {
    it('should have pets category prompt', () => {
      expect(categoryPrompts['pets']).toBeTruthy();
      expect(categoryPrompts['pets']).toContain('pet');
    });

    it('should have family category prompt', () => {
      expect(categoryPrompts['family']).toBeTruthy();
      expect(categoryPrompts['family']).toContain('family');
    });

    it('should have kids category prompt', () => {
      expect(categoryPrompts['kids']).toBeTruthy();
      expect(categoryPrompts['kids']).toContain('child');
    });

    it('should return undefined for unknown categories', () => {
      expect(categoryPrompts['nonexistent']).toBeUndefined();
    });

    it('should instruct preservation of individual features', () => {
      expect(categoryPrompts['pets']).toContain('markings');
      expect(categoryPrompts['family']).toContain('facial features');
      expect(categoryPrompts['kids']).toContain('innocent');
    });
  });
});
