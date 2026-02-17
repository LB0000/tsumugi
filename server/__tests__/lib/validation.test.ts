import { isValidEmail, validatePortraitName } from '../../lib/validation.js';

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

describe('validatePortraitName', () => {
  describe('valid names', () => {
    it('accepts Japanese name', () => {
      expect(validatePortraitName('ポチ')).toBe('ポチ');
      expect(validatePortraitName('太郎')).toBe('太郎');
    });

    it('accepts English name', () => {
      expect(validatePortraitName('Max')).toBe('Max');
      expect(validatePortraitName('Bella')).toBe('Bella');
    });

    it('accepts name with numbers', () => {
      expect(validatePortraitName('Max2')).toBe('Max2');
      expect(validatePortraitName('ポチ3号')).toBe('ポチ3号');
    });

    it('accepts name with spaces', () => {
      expect(validatePortraitName('Max Jr')).toBe('Max Jr');
      expect(validatePortraitName('太郎 犬')).toBe('太郎 犬');
    });

    it('accepts name with hyphens', () => {
      expect(validatePortraitName('Mary-Jane')).toBe('Mary-Jane');
      expect(validatePortraitName('ポチ-太郎')).toBe('ポチ-太郎');
    });

    it('accepts name with apostrophes', () => {
      expect(validatePortraitName("O'Brien")).toBe("O'Brien");
      expect(validatePortraitName("D'Angelo")).toBe("D'Angelo");
    });

    it('accepts name with exactly 20 characters', () => {
      const name = 'a'.repeat(20);
      expect(validatePortraitName(name)).toBe(name);
    });

    it('trims leading and trailing spaces', () => {
      expect(validatePortraitName('  Max  ')).toBe('Max');
      expect(validatePortraitName('\tBella\n')).toBe('Bella');
    });
  });

  describe('invalid names', () => {
    it('rejects empty string', () => {
      expect(validatePortraitName('')).toBeNull();
    });

    it('rejects string with only spaces', () => {
      expect(validatePortraitName('   ')).toBeNull();
    });

    it('rejects string longer than 20 characters', () => {
      const name = 'a'.repeat(21);
      expect(validatePortraitName(name)).toBeNull();
    });

    it('rejects XSS attack (script tag)', () => {
      expect(validatePortraitName('<script>alert("XSS")</script>')).toBeNull();
    });

    it('rejects HTML tags', () => {
      expect(validatePortraitName('<b>Max</b>')).toBeNull();
      expect(validatePortraitName('<img src=x onerror=alert(1)>')).toBeNull();
    });

    it('rejects special characters', () => {
      expect(validatePortraitName('Max@example.com')).toBeNull();
      expect(validatePortraitName('Max#1')).toBeNull();
      expect(validatePortraitName('Max$')).toBeNull();
      expect(validatePortraitName('Max%')).toBeNull();
    });

    it('rejects emoji', () => {
      expect(validatePortraitName('Max🐶')).toBeNull();
      expect(validatePortraitName('ポチ😀')).toBeNull();
    });

    it('rejects non-string types', () => {
      expect(validatePortraitName(null)).toBeNull();
      expect(validatePortraitName(undefined)).toBeNull();
      expect(validatePortraitName(123)).toBeNull();
      expect(validatePortraitName(true)).toBeNull();
      expect(validatePortraitName({})).toBeNull();
      expect(validatePortraitName([])).toBeNull();
    });

    it('rejects newline characters', () => {
      expect(validatePortraitName('Max\nBella')).toBeNull();
      expect(validatePortraitName('Max\rBella')).toBeNull();
    });
  });
});
