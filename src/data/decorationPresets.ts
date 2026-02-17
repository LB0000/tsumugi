import type { DecorationPreset } from '../types/textOverlay';

/**
 * ユーザーが選択可能な装飾プリセット一覧
 *
 * 既存 portraitFonts.ts の代表的なカラー/エフェクト組み合わせを
 * プリセットとして抽出。
 */
export const decorationPresets: readonly DecorationPreset[] = [
  {
    id: 'gold',
    displayName: 'ゴールド',
    color: '#DAA520',
    shadow: { blur: 8, offsetX: 2, offsetY: 2, color: 'rgba(0, 0, 0, 0.7)' },
    stroke: { width: 3, color: '#8B4513' },
  },
  {
    id: 'white',
    displayName: 'ホワイト',
    color: '#FFFFFF',
    stroke: { width: 3, color: '#000000' },
    shadow: { blur: 5, offsetX: 2, offsetY: 2, color: 'rgba(0, 0, 0, 0.7)' },
  },
  {
    id: 'dark',
    displayName: 'ダーク',
    color: '#2C2C2C',
    shadow: { blur: 4, offsetX: 1, offsetY: 1, color: 'rgba(0, 0, 0, 0.4)' },
    stroke: { width: 2, color: '#FFFFFF' },
  },
  {
    id: 'pink-glow',
    displayName: 'ピンクグロー',
    color: '#FFD700',
    glow: { color: 'rgba(255, 182, 193, 0.8)', blur: 15 },
    shadow: { blur: 4, offsetX: 1, offsetY: 1, color: 'rgba(230, 230, 250, 0.6)' },
  },
  {
    id: 'blue',
    displayName: 'ブルー',
    color: '#2E86AB',
    shadow: { blur: 3, offsetX: 1, offsetY: 1, color: 'rgba(0, 0, 0, 0.3)' },
    stroke: { width: 2, color: '#FFFFFF' },
  },
  {
    id: 'pink',
    displayName: 'ピンク',
    color: '#FF1493',
    stroke: { width: 3, color: '#000000' },
    shadow: { blur: 4, offsetX: 1, offsetY: 1, color: 'rgba(0, 0, 0, 0.5)' },
  },
] as const;

/** 装飾IDからプリセットを取得 */
export function getDecorationPreset(decorationId: string): DecorationPreset | undefined {
  return decorationPresets.find((d) => d.id === decorationId);
}
