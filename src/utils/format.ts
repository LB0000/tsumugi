export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatAmount(amount?: number): string {
  if (amount == null) return '-';
  return `¥${amount.toLocaleString()}`;
}

const TRUSTED_RECEIPT_DOMAINS = new Set([
  'squareup.com',
  'squareupsandbox.com',
]);

export function getSafeReceiptUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const domain = parsed.hostname.replace(/^www\./, '');
    return TRUSTED_RECEIPT_DOMAINS.has(domain) ? parsed.toString() : null;
  } catch {
    return null;
  }
}
