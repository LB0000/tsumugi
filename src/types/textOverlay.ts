import type { PortraitFontConfig } from '../data/portraitFonts';

/** テキスト位置プリセット */
export type TextPosition =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right';

/** ユーザー選択可能なフォントカテゴリ */
export type FontCategory = 'elegant' | 'classic' | 'pop' | 'handwritten' | 'japanese';

/** ユーザー選択可能なフォント定義 */
export interface SelectableFont {
  id: string;
  fontFamily: string;
  displayName: string;
  category: FontCategory;
  fontWeight: string | number;
}

/** ユーザー選択可能な装飾プリセット */
export interface DecorationPreset {
  id: string;
  displayName: string;
  color: string;
  shadow?: PortraitFontConfig['shadow'];
  stroke?: PortraitFontConfig['stroke'];
  glow?: PortraitFontConfig['glow'];
}

/** 名入れカスタマイズ設定 */
export interface TextOverlaySettings {
  /** ユーザーが選択したフォントID（null = スタイル推奨フォントを使用） */
  fontId: string | null;
  /** ユーザーが選択した装飾プリセットID（null = スタイル推奨装飾を使用） */
  decorationId: string | null;
  /** テキスト位置 */
  position: TextPosition;
}

export const DEFAULT_TEXT_OVERLAY_SETTINGS: TextOverlaySettings = {
  fontId: null,
  decorationId: null,
  position: 'bottom-center',
};
