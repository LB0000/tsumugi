import { Resend } from 'resend';
import { logger } from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
const APP_NAME = '紡 TSUMUGI';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">メールアドレスの確認</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 24px;">
      ${APP_NAME}へのご登録ありがとうございます。<br>
      以下のボタンをクリックして、メールアドレスの確認を完了してください。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${verifyUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
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
  const html = wrapHtml(`
    <h2 style="font-size:18px;color:#2C2418;margin:0 0 16px;">パスワードの再設定</h2>
    <p style="font-size:14px;color:#5A5148;line-height:1.8;margin:0 0 24px;">
      パスワード再設定のリクエストを受け付けました。<br>
      以下のボタンをクリックして、新しいパスワードを設定してください。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:#8B6914;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
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
