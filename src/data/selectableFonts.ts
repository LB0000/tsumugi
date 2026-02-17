import type { SelectableFont } from '../types/textOverlay';

/**
 * ユーザーが選択可能なフォント一覧
 *
 * 全て index.html の Google Fonts で読み込み済み。
 * 既存 portraitFonts.ts のスタイル対応フォントから、
 * カテゴリ別に代表的なものを厳選。
 */
export const selectableFonts: readonly SelectableFont[] = [
  // Elegant（エレガント）
  {
    id: 'cinzel',
    fontFamily: 'Cinzel Decorative',
    displayName: 'シンゼル',
    category: 'elegant',
    fontWeight: 'bold',
  },
  {
    id: 'playfair',
    fontFamily: 'Playfair Display',
    displayName: 'プレイフェア',
    category: 'elegant',
    fontWeight: 'bold',
  },
  {
    id: 'great-vibes',
    fontFamily: 'Great Vibes',
    displayName: 'グレートバイブス',
    category: 'elegant',
    fontWeight: 'normal',
  },

  // Classic（クラシック）
  {
    id: 'eb-garamond',
    fontFamily: 'EB Garamond',
    displayName: 'ガラモン',
    category: 'classic',
    fontWeight: 600,
  },
  {
    id: 'libre-baskerville',
    fontFamily: 'Libre Baskerville',
    displayName: 'バスカヴィル',
    category: 'classic',
    fontWeight: 'normal',
  },

  // Pop（ポップ）
  {
    id: 'mplus-rounded',
    fontFamily: 'M PLUS Rounded 1c',
    displayName: '丸ゴシック',
    category: 'pop',
    fontWeight: 'bold',
  },
  {
    id: 'bebas',
    fontFamily: 'Bebas Neue',
    displayName: 'ベバス',
    category: 'pop',
    fontWeight: 'normal',
  },

  // Handwritten（手書き）
  {
    id: 'caveat',
    fontFamily: 'Caveat',
    displayName: 'カヴェアト',
    category: 'handwritten',
    fontWeight: 'bold',
  },
  {
    id: 'pacifico',
    fontFamily: 'Pacifico',
    displayName: 'パシフィコ',
    category: 'handwritten',
    fontWeight: 'normal',
  },

  // Japanese（和文）
  {
    id: 'noto-serif',
    fontFamily: 'Noto Serif JP',
    displayName: '明朝体',
    category: 'japanese',
    fontWeight: 600,
  },
  {
    id: 'shippori',
    fontFamily: 'Shippori Mincho',
    displayName: 'しっぽり明朝',
    category: 'japanese',
    fontWeight: 500,
  },
] as const;

/** フォントIDからフォント設定を取得 */
export function getSelectableFont(fontId: string): SelectableFont | undefined {
  return selectableFonts.find((f) => f.id === fontId);
}
