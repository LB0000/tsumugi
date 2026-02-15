declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
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

// ---- Meta Pixel (fbq) ----

function fbq(eventName: string, params?: Record<string, unknown>, eventId?: string): void {
  if (typeof window.fbq !== 'function') return;
  const options = eventId ? { eventID: eventId } : undefined;
  if (params && options) {
    window.fbq('track', eventName, params, options);
  } else if (params) {
    window.fbq('track', eventName, params);
  } else {
    window.fbq('track', eventName);
  }
}

export function trackMetaViewContent(params: { content_name: string; content_ids?: string[]; content_type?: string; value?: number; currency?: string }): void {
  fbq('ViewContent', params);
}

export function trackMetaAddToCart(params: { content_ids: string[]; content_type: string; value: number; currency: string }): void {
  fbq('AddToCart', params);
}

export function trackMetaInitiateCheckout(params: { content_ids?: string[]; num_items?: number; value?: number; currency?: string }): void {
  fbq('InitiateCheckout', params);
}

export function trackMetaPurchase(params: { content_ids: string[]; content_type: string; value: number; currency: string }, eventId?: string): void {
  fbq('Purchase', params, eventId);
}
