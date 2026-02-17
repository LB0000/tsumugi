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

  // Allow only Unicode letters, numbers, spaces (NOT newlines), hyphens, and apostrophes
  // This prevents XSS attacks (e.g., <script>alert('XSS')</script>)
  // Note: Use space literal instead of \s to reject newlines (\n, \r, \t)
  const validCharPattern = /^[\p{L}\p{N} \-']+$/u;
  if (!validCharPattern.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Valid text overlay positions
 */
const VALID_POSITIONS = [
  'bottom-center', 'bottom-left', 'bottom-right',
  'top-center', 'top-left', 'top-right',
] as const;

/**
 * Validates text overlay settings from client
 *
 * @param settings - Text overlay settings (can be any type)
 * @returns Validated settings or null if invalid
 */
export function validateTextOverlaySettings(
  settings: unknown
): { fontId: string | null; decorationId: string | null; position: string } | null {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  const s = settings as Record<string, unknown>;

  const position = typeof s.position === 'string' && (VALID_POSITIONS as readonly string[]).includes(s.position)
    ? s.position
    : 'bottom-center';

  const fontId = typeof s.fontId === 'string' && s.fontId.length <= 50
    ? s.fontId
    : null;

  const decorationId = typeof s.decorationId === 'string' && s.decorationId.length <= 50
    ? s.decorationId
    : null;

  return { fontId, decorationId, position };
}
