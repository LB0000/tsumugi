const SITE_URL = 'https://tsumugi.jp';
const DEFAULT_TITLE = 'TSUMUGI - 肖像画ギフト専門店';
const DEFAULT_DESCRIPTION = 'ペットや家族の写真をルネサンス風の肖像画に変換。世界に一つだけのギフトをお届けします。';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/ogp-default.jpg`;

export interface MetaTagUpdate {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
}

/**
 * Update OGP and Twitter Card meta tags dynamically.
 * Returns a cleanup function that restores defaults.
 */
export function updateMetaTags(meta: MetaTagUpdate): () => void {
  if (meta.title) {
    document.title = meta.title;
    setMetaContent('property', 'og:title', meta.title);
    setMetaContent('name', 'twitter:title', meta.title);
  }
  if (meta.description) {
    setMetaContent('name', 'description', meta.description);
    setMetaContent('property', 'og:description', meta.description);
    setMetaContent('name', 'twitter:description', meta.description);
  }
  if (meta.ogImage) {
    setMetaContent('property', 'og:image', meta.ogImage);
    setMetaContent('name', 'twitter:image', meta.ogImage);
  }
  if (meta.ogUrl) {
    setMetaContent('property', 'og:url', meta.ogUrl);
  }

  return () => {
    document.title = DEFAULT_TITLE;
    setMetaContent('name', 'description', DEFAULT_DESCRIPTION);
    setMetaContent('property', 'og:title', DEFAULT_TITLE);
    setMetaContent('property', 'og:description', DEFAULT_DESCRIPTION);
    setMetaContent('property', 'og:image', DEFAULT_OG_IMAGE);
    setMetaContent('property', 'og:url', SITE_URL);
    setMetaContent('name', 'twitter:title', DEFAULT_TITLE);
    setMetaContent('name', 'twitter:description', DEFAULT_DESCRIPTION);
    setMetaContent('name', 'twitter:image', DEFAULT_OG_IMAGE);
  };
}

function setMetaContent(attr: 'property' | 'name', key: string, value: string): void {
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  if (el) {
    el.setAttribute('content', value);
  }
}

/**
 * Inject or update a JSON-LD script element.
 * Uses a data attribute to identify scripts for later updates.
 */
export function injectJsonLd(id: string, data: Record<string, unknown>): () => void {
  const existingScript = document.querySelector(`script[data-jsonld="${id}"]`);

  if (existingScript) {
    existingScript.textContent = JSON.stringify(data);
  } else {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-jsonld', id);
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  return () => {
    document.querySelector(`script[data-jsonld="${id}"]`)?.remove();
  };
}
