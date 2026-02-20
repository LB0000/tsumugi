import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN || '';

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
            try {
              const url = new URL(breadcrumb.data.url);
              url.searchParams.delete('token');
              url.searchParams.delete('session');
              breadcrumb.data.url = url.toString();
            } catch {
              // not a valid URL, skip
            }
          }
        }
      }
      return event;
    },
  });
}

export { Sentry };
