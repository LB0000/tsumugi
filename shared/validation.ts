/**
 * バリデーション定数 — Single Source of Truth (SSOT)
 *
 * フロントエンド (src/) とバックエンド (server/) の
 * 両方がこのファイルからバリデーション定数を取得します。
 * バリデーションルールを変更する場合はここだけを編集してください。
 */

// ── 名前入力 ──────────────────────────────────────────────

/** 許可文字パターン: Unicode文字、数字、スペース、ハイフン、アポストロフィ
 *  WARNING: Do NOT add the 'g' flag — this regex is shared globally and 'g' makes test() stateful */
export const PORTRAIT_NAME_PATTERN = /^[\p{L}\p{N} \-']+$/u;

/** 名前の最大文字数 */
export const PORTRAIT_NAME_MAX_LENGTH = 20;

// ── 配送先住所 ──────────────────────────────────────────────

/** 各フィールドの最大文字数 */
export const SHIPPING_FIELD_LIMITS = {
  lastName: 50,
  firstName: 50,
  email: 254,
  phone: 20,
  postalCode: 10,
  prefecture: 10,
  city: 100,
  addressLine: 200,
} as const;

// ── 郵便番号 ──────────────────────────────────────────────

/** 日本の郵便番号パターン (XXX-XXXX または XXXXXXX) */
export const POSTAL_CODE_PATTERN = /^\d{3}-?\d{4}$/;
