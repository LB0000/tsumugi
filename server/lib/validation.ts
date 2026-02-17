export function isValidEmail(value: string): boolean {
  // RFC 5321 準拠: local@domain.tld（連続ドット禁止、TLD 2文字以上）
  return value.length <= 254 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(value) && !value.includes('..');
}

/**
 * Validates and sanitizes portrait name input
 *
 * [M7] Server-side validation to prevent XSS attacks
 * Matches frontend validation in src/lib/validation/nameValidation.ts
 *
 * @param name - Portrait name input (can be any type)
 * @returns Sanitized name string or null if invalid
 */
export function validatePortraitName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const sanitized = name.trim();

  // Reject empty or too long names
  if (sanitized.length === 0 || sanitized.length > 20) {
    return null;
  }

  // Allow only Unicode letters, numbers, spaces, hyphens, and apostrophes
  // This prevents XSS attacks (e.g., <script>alert('XSS')</script>)
  const validCharPattern = /^[\p{L}\p{N}\s\-']+$/u;
  if (!validCharPattern.test(sanitized)) {
    return null;
  }

  return sanitized;
}
