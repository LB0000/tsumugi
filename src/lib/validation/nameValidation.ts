/**
 * 名前入力のバリデーション結果
 */
export interface NameValidationResult {
  /** バリデーション成功 */
  isValid: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** クリーンアップされたテキスト */
  cleanedText?: string;
}

/**
 * 名前入力をバリデーション
 * @param name ユーザー入力の名前
 * @returns バリデーション結果
 */
export function validatePortraitName(name: string): NameValidationResult {
  // 空欄はOK（オプション機能）
  if (!name || name.trim() === '') {
    return { isValid: true, cleanedText: '' };
  }

  // 文字数制限チェック（最大20文字）
  if (name.length > 20) {
    return {
      isValid: false,
      error: '名前は20文字以内で入力してください。',
    };
  }

  // 許可文字チェック：Unicode文字、数字、スペース、ハイフン、アポストロフィ
  // 絵文字・特殊記号は不可
  const validCharPattern = /^[\p{L}\p{N} \-']+$/u;
  if (!validCharPattern.test(name)) {
    return {
      isValid: false,
      error: '使用できない文字が含まれています。文字、数字、スペース、ハイフンのみ使用できます。',
    };
  }

  // 改行を削除（単一行に変換）
  const cleanedText = name.replace(/[\r\n]+/g, ' ').trim();

  // 連続スペースを1つに正規化
  const normalizedText = cleanedText.replace(/\s+/g, ' ');

  return {
    isValid: true,
    cleanedText: normalizedText,
  };
}

/**
 * リアルタイムバリデーション（入力中の警告表示用）
 * @param name ユーザー入力の名前
 * @returns 警告メッセージ（問題がある場合）
 */
export function getNameInputWarning(name: string): string | null {
  if (!name || name.trim() === '') {
    return null;
  }

  // 文字数警告
  if (name.length > 20) {
    return `${name.length}/20文字（上限を超えています）`;
  }

  if (name.length > 15) {
    return `${name.length}/20文字`;
  }

  // 不正文字警告
  const validCharPattern = /^[\p{L}\p{N} \-']+$/u;
  if (!validCharPattern.test(name)) {
    return '使用できない文字が含まれています';
  }

  return null;
}

/**
 * 入力補助：禁止文字を自動削除
 * @param name ユーザー入力の名前
 * @returns クリーンアップされたテキスト
 */
export function sanitizePortraitName(name: string): string {
  if (!name) return '';

  // 許可文字以外を削除
  const cleaned = name.replace(/[^\p{L}\p{N} \-']/gu, '');

  // 改行をスペースに変換
  const singleLine = cleaned.replace(/[\r\n]+/g, ' ');

  // 連続スペースを1つに正規化
  const normalized = singleLine.replace(/\s+/g, ' ');

  // 最大20文字に切り詰め
  const truncated = normalized.slice(0, 20);

  return truncated;
}

/**
 * プレビュー用：表示テキストを準備
 * @param name ユーザー入力の名前
 * @returns プレビュー表示用のテキスト（空欄の場合は null）
 */
export function preparePreviewText(name: string): string | null {
  const validation = validatePortraitName(name);

  if (!validation.isValid || !validation.cleanedText) {
    return null;
  }

  return validation.cleanedText;
}
