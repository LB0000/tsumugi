import {
  parseCookies,
  extractBearerToken,
  extractSessionTokenFromHeaders,
  areTokensEqual,
  isAllowedOrigin,
  AUTH_SESSION_COOKIE_NAME,
} from '../../lib/requestAuth.js';

describe('parseCookies', () => {
  it('parses a cookie header with multiple cookies', () => {
    const cookies = parseCookies('a=1; b=2');
    expect(cookies.get('a')).toBe('1');
    expect(cookies.get('b')).toBe('2');
    expect(cookies.size).toBe(2);
  });

  it('returns an empty map for undefined', () => {
    const cookies = parseCookies(undefined);
    expect(cookies.size).toBe(0);
  });

  it('returns an empty map for an empty string', () => {
    const cookies = parseCookies('');
    expect(cookies.size).toBe(0);
  });

  it('handles values containing =', () => {
    const cookies = parseCookies('token=abc=def');
    expect(cookies.get('token')).toBe('abc=def');
  });

  it('decodes percent-encoded values', () => {
    const cookies = parseCookies('name=%E3%83%86%E3%82%B9%E3%83%88');
    expect(cookies.get('name')).toBe('テスト');
  });
});

describe('extractBearerToken', () => {
  it('extracts a token from a Bearer header', () => {
    expect(extractBearerToken({ authorization: 'Bearer xxx' })).toBe('xxx');
  });

  it('returns null when authorization is missing', () => {
    expect(extractBearerToken({})).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(extractBearerToken({ authorization: 'Basic abc' })).toBeNull();
  });

  it('returns null when token part is missing', () => {
    expect(extractBearerToken({ authorization: 'Bearer' })).toBeNull();
  });
});

describe('extractSessionTokenFromHeaders', () => {
  it('prefers Bearer token over cookie', () => {
    const headers = {
      authorization: 'Bearer from-header',
      cookie: `${AUTH_SESSION_COOKIE_NAME}=from-cookie`,
    };
    expect(extractSessionTokenFromHeaders(headers)).toBe('from-header');
  });

  it('falls back to cookie when no Bearer token', () => {
    const headers = {
      cookie: `${AUTH_SESSION_COOKIE_NAME}=from-cookie`,
    };
    expect(extractSessionTokenFromHeaders(headers)).toBe('from-cookie');
  });

  it('returns null when neither is present', () => {
    expect(extractSessionTokenFromHeaders({})).toBeNull();
  });
});

describe('areTokensEqual', () => {
  it('returns true for matching tokens', () => {
    expect(areTokensEqual('secret123', 'secret123')).toBe(true);
  });

  it('returns false for mismatched tokens', () => {
    expect(areTokensEqual('secret123', 'secret456')).toBe(false);
  });

  it('returns false for tokens of different length', () => {
    expect(areTokensEqual('short', 'muchlongertoken')).toBe(false);
  });
});

describe('isAllowedOrigin', () => {
  it('returns true in production when origin matches frontend URL', () => {
    expect(
      isAllowedOrigin({
        originHeader: 'https://example.com',
        frontendUrl: 'https://example.com',
        isProduction: true,
      }),
    ).toBe(true);
  });

  it('returns false in production when origin does not match', () => {
    expect(
      isAllowedOrigin({
        originHeader: 'https://evil.com',
        frontendUrl: 'https://example.com',
        isProduction: true,
      }),
    ).toBe(false);
  });

  it('returns false in production when origin is missing', () => {
    expect(
      isAllowedOrigin({
        originHeader: undefined,
        frontendUrl: 'https://example.com',
        isProduction: true,
      }),
    ).toBe(false);
  });

  it('returns true in development regardless of origin', () => {
    expect(
      isAllowedOrigin({
        originHeader: 'https://anything.com',
        frontendUrl: 'https://example.com',
        isProduction: false,
      }),
    ).toBe(true);
  });

  it('returns true when frontendUrl is undefined (not configured)', () => {
    expect(
      isAllowedOrigin({
        originHeader: 'https://anything.com',
        frontendUrl: undefined,
        isProduction: true,
      }),
    ).toBe(true);
  });
});
