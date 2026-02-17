/**
 * アプリケーション全体で使用する定数
 */

// 24時間限定割引の定数は shared/catalog.ts (SSOT) から import
export { DISCOUNT_RATE, DISCOUNT_WINDOW_MS } from '../../shared/catalog.js';

/**
 * プレビュー生成時刻を保存する localStorage キー
 */
export const PREVIEW_GENERATED_AT_KEY = 'preview_generated_at';
