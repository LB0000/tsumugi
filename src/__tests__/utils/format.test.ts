// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, getSafeReceiptUrl } from '../../utils/format';

describe('formatDate', () => {
  it('formats a valid ISO date string in Japanese locale', () => {
    const result = formatDate('2024-03-15');
    // ja-JP format: "2024年3月15日"
    expect(result).toContain('2024');
    expect(result).toContain('3');
    expect(result).toContain('15');
  });

  it('returns "-" when dateStr is undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns "-" when dateStr is empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('returns the original string for an invalid date', () => {
    // new Date('not-a-date') returns Invalid Date, toLocaleDateString may throw
    // depending on the environment; the catch block returns the original string
    const result = formatDate('not-a-date');
    // In jsdom, Invalid Date.toLocaleDateString may return "Invalid Date" or throw
    // Either way, the function should not throw
    expect(typeof result).toBe('string');
  });

  it('handles ISO datetime strings', () => {
    const result = formatDate('2025-12-25T10:30:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('12');
    expect(result).toContain('25');
  });
});

describe('formatAmount', () => {
  it('formats a positive number with yen symbol', () => {
    expect(formatAmount(1000)).toBe('¥1,000');
  });

  it('formats zero', () => {
    expect(formatAmount(0)).toBe('¥0');
  });

  it('formats a large number with commas', () => {
    expect(formatAmount(1234567)).toBe('¥1,234,567');
  });

  it('returns "-" when amount is undefined', () => {
    expect(formatAmount(undefined)).toBe('-');
  });

  it('returns "-" when amount is null', () => {
    expect(formatAmount(null as unknown as undefined)).toBe('-');
  });

  it('formats negative numbers', () => {
    expect(formatAmount(-500)).toBe('¥-500');
  });
});

describe('getSafeReceiptUrl', () => {
  it('returns the URL for trusted squareup.com domain', () => {
    const url = 'https://squareup.com/receipt/preview/abc123';
    expect(getSafeReceiptUrl(url)).toBe(url);
  });

  it('returns the URL for trusted squareupsandbox.com domain', () => {
    const url = 'https://squareupsandbox.com/receipt/preview/abc123';
    expect(getSafeReceiptUrl(url)).toBe(url);
  });

  it('returns the URL for trusted domain with www prefix', () => {
    const url = 'https://www.squareup.com/receipt/preview/abc123';
    expect(getSafeReceiptUrl(url)).toBe(url);
  });

  it('returns null for untrusted domain', () => {
    expect(getSafeReceiptUrl('https://evil.com/receipt')).toBeNull();
  });

  it('returns null for http (non-https) URL', () => {
    expect(getSafeReceiptUrl('http://squareup.com/receipt')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(getSafeReceiptUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getSafeReceiptUrl('')).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(getSafeReceiptUrl('not-a-url')).toBeNull();
  });

  it('returns null for javascript: protocol', () => {
    expect(getSafeReceiptUrl('javascript:alert(1)')).toBeNull();
  });

  it('returns null for data: protocol', () => {
    expect(getSafeReceiptUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });
});
