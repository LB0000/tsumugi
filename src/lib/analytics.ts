declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

let gtmInitialized = false;

export function initGTM(gtmId: string): void {
  if (!gtmId || gtmInitialized) return;
  gtmInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

export function trackEvent(event: string, params?: Record<string, unknown>): void {
  if (!window.dataLayer) return;
  window.dataLayer.push({ event, ...params });
}

export function trackPageView(page: string, title: string): void {
  trackEvent('page_view', { page_path: page, page_title: title });
}

export function trackEcommerce(action: string, data: Record<string, unknown>): void {
  trackEvent(action, { ecommerce: data });
}
