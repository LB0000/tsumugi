import { timingSafeEqual } from 'crypto';

export const AUTH_SESSION_COOKIE_NAME = 'fable_session';
export const AUTH_CSRF_COOKIE_NAME = 'fable_csrf';

type HeaderValue = string | string[] | undefined;
export type HeaderMap = Record<string, HeaderValue>;

function getHeaderFirstValue(value: HeaderValue): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const entry of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = entry.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;

    const name = rawName.trim();
    const value = rawValue.join('=').trim();
    if (!name || !value) continue;

    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }

  return cookies;
}

export function extractBearerToken(headers: HeaderMap): string | null {
  const authorization = getHeaderFirstValue(headers.authorization);
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

export function extractSessionTokenFromHeaders(headers: HeaderMap): string | null {
  const bearerToken = extractBearerToken(headers);
  if (bearerToken) return bearerToken;

  const cookieHeader = getHeaderFirstValue(headers.cookie);
  const cookies = parseCookies(cookieHeader);
  return cookies.get(AUTH_SESSION_COOKIE_NAME) ?? null;
}

export function extractCsrfTokenFromCookie(headers: HeaderMap): string | null {
  const cookieHeader = getHeaderFirstValue(headers.cookie);
  const cookies = parseCookies(cookieHeader);
  return cookies.get(AUTH_CSRF_COOKIE_NAME) ?? null;
}

export function extractCsrfTokenFromHeader(headers: HeaderMap): string | null {
  const token = getHeaderFirstValue(headers['x-csrf-token']);
  if (!token) return null;
  const normalized = token.trim();
  return normalized.length > 0 ? normalized : null;
}

export function areTokensEqual(leftToken: string, rightToken: string): boolean {
  const left = Buffer.from(leftToken);
  const right = Buffer.from(rightToken);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isAllowedOrigin(params: {
  originHeader: string | undefined;
  frontendUrl: string | undefined;
  isProduction: boolean;
}): boolean {
  const { originHeader, frontendUrl, isProduction } = params;
  if (!isProduction || !frontendUrl) return true;
  if (!originHeader) return false;
  return originHeader === frontendUrl;
}
