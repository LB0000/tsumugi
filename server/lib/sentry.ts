import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN || '';

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Strip sensitive headers
      if (event.request?.headers) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cookie: _cookie, authorization: _authorization, ...safeHeaders } = event.request.headers;
        event.request.headers = safeHeaders;
      }
      return event;
    },
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return;

  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureMessage(String(error), { level: 'error', extra: context });
  }
}

export { Sentry };
