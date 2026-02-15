import { Resend } from 'resend';
import { createUnsubscribeUrl } from './unsubscribe.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const DEFAULT_FROM_EMAIL = 'noreply@example.com';
const FROM_EMAIL = process.env.FROM_EMAIL || DEFAULT_FROM_EMAIL;
const APP_NAME = '紡 TSUMUGI';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const ALLOWED_MARKETING_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'span',
  'div',
]);

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeFromEmail(raw: string): string {
  const normalized = raw.trim();
  if (!normalized) return DEFAULT_FROM_EMAIL;
  if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(normalized)) return normalized;
  return DEFAULT_FROM_EMAIL;
}

function normalizeSubject(raw: string): string {
  return raw.replace(/[\r\n]+/g, ' ').trim();
}

function sanitizeMarketingHtml(content: string): string {
  let sanitized = content;

  // Remove comments and dangerous tags entirely.
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*\/?>/gi,
    '',
  );

  // Remove inline handlers/styles and unsafe URL schemes.
  sanitized = sanitized.replace(/\son[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  sanitized = sanitized.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (full, attr, rawValue) => {
    const unquoted = String(rawValue).trim().replace(/^['"]|['"]$/g, '');
    const normalized = unquoted.toLowerCase();
    const isDangerous =
      normalized.startsWith('javascript:') ||
      normalized.startsWith('vbscript:') ||
      normalized.startsWith('data:');
    if (isDangerous) return '';

    if (
      attr.toLowerCase() === 'href' &&
      !normalized.startsWith('http://') &&
      !normalized.startsWith('https://') &&
      !normalized.startsWith('mailto:') &&
      !normalized.startsWith('#')
    ) {
      return '';
    }

    return ` ${attr.toLowerCase()}="${escapeHtmlAttribute(unquoted)}"`;
  });

  // Allow only a constrained set of tags.
  sanitized = sanitized.replace(/<\/?([a-z0-9-]+)\b([^>]*)>/gi, (tag, rawTagName, rawAttrs) => {
    const tagName = String(rawTagName).toLowerCase();
    if (!ALLOWED_MARKETING_TAGS.has(tagName)) return '';

    if (tag.startsWith('</')) {
      return tagName === 'br' ? '' : `</${tagName}>`;
    }

    if (tagName === 'br') return '<br>';

    if (tagName === 'a') {
      const attrs = String(rawAttrs);
      const hrefMatch = attrs.match(/\shref\s*=\s*"([^"]*)"/i);
      const titleMatch = attrs.match(/\stitle\s*=\s*"([^"]*)"/i);
      const hrefAttr = hrefMatch ? ` href="${escapeHtmlAttribute(hrefMatch[1])}"` : '';
      const titleAttr = titleMatch ? ` title="${escapeHtmlAttribute(titleMatch[1])}"` : '';
      return `<a${hrefAttr}${titleAttr} target="_blank" rel="noopener noreferrer">`;
    }

    return `<${tagName}>`;
  });

  return sanitized;
}

function wrapMarketingHtml(content: string, recipientEmail: string): string {
  const safeFromEmail = normalizeFromEmail(FROM_EMAIL);
  const unsubscribeHref = createUnsubscribeUrl(recipientEmail)
    ?? `mailto:${encodeURIComponent(safeFromEmail)}?subject=${encodeURIComponent('配信停止希望')}`;
  const sanitizedContent = sanitizeMarketingHtml(content);

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Hiragino Sans','Meiryo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;border:1px solid #E8E0D4;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#8B6914,#B8860B);padding:24px;text-align:center;">
          <span style="font-size:28px;color:#FFFFFF;letter-spacing:0.1em;">紡</span>
          <br><span style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.3em;">TSUMUGI</span>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          ${sanitizedContent}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #E8E0D4;text-align:center;">
          <span style="font-size:11px;color:#8B8178;">&copy; ${new Date().getFullYear()} ${APP_NAME}</span>
          <br><a href="${escapeHtmlAttribute(unsubscribeHref)}" style="font-size:10px;color:#8B8178;text-decoration:underline;">配信停止はこちら</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
}

export async function sendMarketingEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const html = wrapMarketingHtml(params.htmlBody, params.to);
  const safeFromEmail = normalizeFromEmail(FROM_EMAIL);
  const safeSubject = normalizeSubject(params.subject);

  if (!resend) {
    console.log(`[Email] Resend not configured. Would send to: ${params.to}, Subject: ${safeSubject}`);
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${safeFromEmail}>`,
      to: params.to,
      subject: safeSubject,
      html,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send marketing email:', message);
    return { success: false, error: message };
  }
}

const BATCH_CONCURRENCY = 5;

export async function sendBulkMarketingEmails(
  recipients: string[],
  subject: string,
  htmlBody: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches with limited concurrency
  for (let i = 0; i < recipients.length; i += BATCH_CONCURRENCY) {
    const batch = recipients.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((to) => sendMarketingEmail({ to, subject, htmlBody }).then((r) => ({ to, ...r }))),
    );

    for (const [idx, result] of results.entries()) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const reason = result.status === 'rejected'
          ? String(result.reason)
          : result.value.error ?? 'Unknown error';
        const to = result.status === 'fulfilled' ? result.value.to : batch[idx];
        errors.push(`${to}: ${reason}`);
      }
    }
  }

  return { sent, failed, errors };
}
