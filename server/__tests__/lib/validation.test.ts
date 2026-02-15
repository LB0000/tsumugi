import { isValidEmail } from '../../lib/validation.js';

describe('isValidEmail', () => {
  it('accepts a standard email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('accepts an email with plus tag', () => {
    expect(isValidEmail('user+tag@domain.co.jp')).toBe(true);
  });

  it('accepts a minimal email', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rejects a string without @', () => {
    expect(isValidEmail('noat')).toBe(false);
  });

  it('rejects a string starting with @', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('rejects a string ending with @', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects a string containing spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('accepts an email with exactly 254 characters', () => {
    // local@domain.tld  — build a 254-char address
    const local = 'a'.repeat(64);
    const domainLabel = 'b'.repeat(254 - 64 - 1 - 3); // minus local(64), @(1), .co(3)
    const email = `${local}@${domainLabel}.co`;
    expect(email.length).toBe(254);
    expect(isValidEmail(email)).toBe(true);
  });

  it('rejects an email with 255 characters', () => {
    const local = 'a'.repeat(64);
    const domainLabel = 'b'.repeat(255 - 64 - 1 - 3);
    const email = `${local}@${domainLabel}.co`;
    expect(email.length).toBe(255);
    expect(isValidEmail(email)).toBe(false);
  });
});
