import { Resend } from 'resend';
import { logger } from './logger.js';
import type { OrderItem, OrderShippingAddress } from './checkoutState.js';

import { config } from '../config.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
const APP_NAME = '紡 TSUMUGI';
const DEV_FRONTEND_URL = 'http://localhost:5173';

function getSafeFrontendUrl(): string {
  const raw = (config.FRONTEND_URL ?? DEV_FRONTEND_URL).trim();
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEV_FRONTEND_URL;
    }
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return DEV_FRONTEND_URL;
  }
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FRONTEND_URL = getSafeFrontendUrl();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const escapeHtmlAttribute = escapeHtml;

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Hiragino Sans','Meiryo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#FFFFFF;border-radius:16px;border:1px solid #E8E0D4;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#8B6914,#B8860B);padding:24px;text-align:center;">
          <span style="font-size:28px;color:#FFFFFF;letter-spacing:0.1em;">紡</span>
          <br><span style="font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:0.3em;">TSUMUGI</span>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #E8E0D4;text-align:center;">
          <span style="font-size:11px;color:#8B8178;">&copy; ${new Date().getFullYear()} ${APP_NAME}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const safeVerifyUrl = escapeHtmlAttribute(verifyUrl);
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">メールアドレスの確認</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 24px;">
      ${APP_NAME}へのご登録ありがとうございます。<br>
      以下のボタンをクリックして、メールアドレスの確認を完了してください。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeVerifyUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          メールアドレスを確認する
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#8B8178;line-height:1.6;">
      このリンクは30分間有効です。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, verification URL generated', { verifyUrl });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `【${APP_NAME}】メールアドレスの確認`,
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send verification email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const safeResetUrl = escapeHtmlAttribute(resetUrl);
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">パスワードの再設定</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 24px;">
      パスワード再設定のリクエストを受け付けました。<br>
      以下のボタンをクリックして、新しいパスワードを設定してください。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeResetUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          パスワードを再設定する
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#8B8178;line-height:1.6;">
      このリンクは30分間有効です。<br>
      心当たりがない場合は、このメールを無視してください。
    </p>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, reset URL generated', { resetUrl });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `【${APP_NAME}】パスワード再設定`,
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
  const shopUrl = `${FRONTEND_URL}/pricing`;
  const safeShopUrl = escapeHtmlAttribute(shopUrl);
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">ようこそ、${escapeHtml(userName)}さん！</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 16px;">
      ${APP_NAME}へのご登録ありがとうございます。<br>
      当サービスでは、大切なペットやご家族の写真をAIでルネサンス風の肖像画に変換いたします。
    </p>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 8px;">
      初回限定で<strong style="color:#8B6914;">10%OFFクーポン</strong>をプレゼント！
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
      <tr><td align="center">
        <span style="display:inline-block;background:#FAF8F5;border:2px dashed #8B6914;border-radius:8px;padding:12px 24px;font-size:20px;font-weight:700;color:#8B6914;letter-spacing:0.1em;">WELCOME10</span>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeShopUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          さっそく肖像画を作る
        </a>
      </td></tr>
    </table>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, welcome email skipped', { to });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: 'TSUMUGIへようこそ！初回10%OFFクーポンをプレゼント',
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send welcome email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendOrderConfirmationEmail(to: string, order: {
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress?: OrderShippingAddress;
}): Promise<boolean> {
  const itemRows = order.items.map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#5A5148;">${escapeHtml(item.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#5A5148;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#5A5148;text-align:right;">&yen;${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
  ).join('');

  const addressBlock = order.shippingAddress
    ? `<div style="margin:20px 0;padding:16px;background:#FAF8F5;border-radius:8px;">
        <p style="font-size:12px;color:#8B8178;margin:0 0 8px;font-weight:600;">配送先</p>
        <p style="font-size:13px;color:#5A5148;line-height:1.6;margin:0;">
          〒${escapeHtml(order.shippingAddress.postalCode)}<br>
          ${escapeHtml(order.shippingAddress.prefecture)}${escapeHtml(order.shippingAddress.city)}${escapeHtml(order.shippingAddress.addressLine)}<br>
          ${escapeHtml(order.shippingAddress.lastName)} ${escapeHtml(order.shippingAddress.firstName)} 様
        </p>
      </div>`
    : '';

  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">ご注文ありがとうございます</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 8px;">
      ご注文を承りました。以下の内容をご確認ください。
    </p>
    <p style="font-size:13px;color:#8B8178;margin:0 0 20px;">
      注文番号: <strong style="color:#2C2418;">${escapeHtml(order.orderId)}</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E0D4;border-radius:8px;overflow:hidden;">
      <tr style="background:#FAF8F5;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#8B8178;font-weight:600;">商品名</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#8B8178;font-weight:600;">数量</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#8B8178;font-weight:600;">小計</th>
      </tr>
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#2C2418;">合計</td>
        <td style="padding:12px;text-align:right;font-size:16px;font-weight:700;color:#8B6914;">&yen;${order.totalAmount.toLocaleString()}</td>
      </tr>
    </table>
    ${addressBlock}
    <p style="font-size:12px;color:#8B8178;line-height:1.6;margin:20px 0 0;">
      お届けまで通常3〜5営業日ほどお時間をいただいております。<br>
      発送時に改めてご連絡いたします。
    </p>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, order confirmation email skipped', { orderId: order.orderId });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `【TSUMUGI】ご注文ありがとうございます（注文番号: ${order.orderId}）`,
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send order confirmation email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendShippingNotificationEmail(to: string, orderId: string, trackingNumber: string): Promise<boolean> {
  const trackingUrl = `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${encodeURIComponent(trackingNumber)}`;
  const safeTrackingUrl = escapeHtmlAttribute(trackingUrl);
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">商品を発送しました</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 16px;">
      ご注文いただいた商品を発送いたしました。
    </p>
    <div style="margin:16px 0;padding:16px;background:#FAF8F5;border-radius:8px;">
      <p style="font-size:12px;color:#8B8178;margin:0 0 4px;">注文番号</p>
      <p style="font-size:14px;color:#2C2418;margin:0 0 12px;font-weight:600;">${escapeHtml(orderId)}</p>
      <p style="font-size:12px;color:#8B8178;margin:0 0 4px;">追跡番号</p>
      <p style="font-size:14px;color:#2C2418;margin:0;font-weight:600;">${escapeHtml(trackingNumber)}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeTrackingUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          配送状況を確認する
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#8B8178;line-height:1.6;">
      お届けまで1〜3日程度かかる場合がございます。<br>
      配送に関するご不明点は追跡番号をお手元にお問い合わせください。
    </p>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, shipping notification email skipped', { orderId, trackingNumber });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: '【TSUMUGI】商品を発送しました',
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send shipping notification email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendReviewRequestEmail(to: string, orderId: string, userName: string): Promise<boolean> {
  const reviewUrl = `${FRONTEND_URL}/account`;
  const safeReviewUrl = escapeHtmlAttribute(reviewUrl);
  const stars = '★★★★★';
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">${escapeHtml(userName)}さん、ご感想をお聞かせください</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 16px;">
      先日は${APP_NAME}をご利用いただきありがとうございました。<br>
      お届けした作品はいかがでしたでしょうか？
    </p>
    <div style="text-align:center;margin:20px 0;">
      <span style="font-size:32px;color:#D4A017;letter-spacing:4px;">${stars}</span>
    </div>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 24px;text-align:center;">
      ぜひレビューを投稿して<br>ご感想をお聞かせください。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeReviewUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          レビューを投稿する
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#8B8178;line-height:1.6;">
      注文番号: ${escapeHtml(orderId)}
    </p>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, review request email skipped', { orderId });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: '【TSUMUGI】ご感想をお聞かせください',
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send review request email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

export async function sendCartAbandonmentEmail(to: string, items: { name: string; price: number }[]): Promise<boolean> {
  const cartUrl = `${FRONTEND_URL}/cart`;
  const safeCartUrl = escapeHtmlAttribute(cartUrl);
  const itemList = items.map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#5A5148;">${escapeHtml(item.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8E0D4;font-size:13px;color:#5A5148;text-align:right;">&yen;${item.price.toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">お忘れ物はありませんか？</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 20px;">
      カートに商品が残っています。<br>
      お買い忘れはございませんか？
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E0D4;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      <tr style="background:#FAF8F5;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#8B8178;font-weight:600;">商品名</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#8B8178;font-weight:600;">価格</th>
      </tr>
      ${itemList}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${safeCartUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          お買い物を続ける
        </a>
      </td></tr>
    </table>
  `);

  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Resend not configured, cart abandonment email skipped', { to });
    }
    return true;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: 'お忘れ物はありませんか？',
      html,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send cart abandonment email', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
