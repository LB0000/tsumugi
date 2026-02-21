import { describe, it, expect } from 'vitest';
import {
  PORTRAIT_NAME_PATTERN,
  PORTRAIT_NAME_MAX_LENGTH,
  SHIPPING_FIELD_LIMITS,
  POSTAL_CODE_PATTERN,
} from '../validation';

describe('shared/validation constants', () => {
  describe('PORTRAIT_NAME_PATTERN', () => {
    it('accepts Unicode letters, numbers, spaces, hyphens, apostrophes', () => {
      expect(PORTRAIT_NAME_PATTERN.test('太郎')).toBe(true);
      expect(PORTRAIT_NAME_PATTERN.test("O'Brien")).toBe(true);
      expect(PORTRAIT_NAME_PATTERN.test('John-Paul')).toBe(true);
      expect(PORTRAIT_NAME_PATTERN.test('ABC 123')).toBe(true);
    });

    it('rejects special characters and emoji', () => {
      expect(PORTRAIT_NAME_PATTERN.test('<script>')).toBe(false);
      expect(PORTRAIT_NAME_PATTERN.test('hello!')).toBe(false);
      expect(PORTRAIT_NAME_PATTERN.test('')).toBe(false);
      expect(PORTRAIT_NAME_PATTERN.test('Max 🐶')).toBe(false);
      expect(PORTRAIT_NAME_PATTERN.test('🎨')).toBe(false);
    });
  });

  describe('PORTRAIT_NAME_MAX_LENGTH', () => {
    it('is 20', () => {
      expect(PORTRAIT_NAME_MAX_LENGTH).toBe(20);
    });
  });

  describe('SHIPPING_FIELD_LIMITS', () => {
    it('has expected fields with positive limits', () => {
      const fields = ['lastName', 'firstName', 'email', 'phone', 'postalCode', 'prefecture', 'city', 'addressLine'] as const;
      for (const field of fields) {
        expect(SHIPPING_FIELD_LIMITS[field]).toBeGreaterThan(0);
      }
    });

    it('has correct values for all fields', () => {
      expect(SHIPPING_FIELD_LIMITS).toEqual({
        lastName: 50,
        firstName: 50,
        email: 254,
        phone: 20,
        postalCode: 10,
        prefecture: 10,
        city: 100,
        addressLine: 200,
      });
    });
  });

  describe('POSTAL_CODE_PATTERN', () => {
    it('accepts valid Japanese postal codes', () => {
      expect(POSTAL_CODE_PATTERN.test('100-0001')).toBe(true);
      expect(POSTAL_CODE_PATTERN.test('1000001')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(POSTAL_CODE_PATTERN.test('100-000')).toBe(false);
      expect(POSTAL_CODE_PATTERN.test('abc-defg')).toBe(false);
      expect(POSTAL_CODE_PATTERN.test('')).toBe(false);
    });
  });
});
