/**
 * 各アートスタイルに最適化されたフォント設定
 * Canvas overlay で名前を表示する際に使用
 */

export interface PortraitFontConfig {
  /** Google Fonts フォント名 */
  fontFamily: string;
  /** フォント太さ */
  fontWeight: string | number;
  /** テキスト色（HEX） */
  color: string;
  /** 影の設定 */
  shadow?: {
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  };
  /** 縁取り設定 */
  stroke?: {
    width: number;
    color: string;
  };
  /** グロー効果 */
  glow?: {
    color: string;
    blur: number;
  };
}

/** スタイルID → フォント設定のマッピング */
export const portraitFonts: Record<string, PortraitFontConfig> = {
  // 西洋絵画 (Western)
  'baroque': {
    fontFamily: 'Cinzel Decorative',
    fontWeight: 'bold',
    color: '#DAA520', // ゴールド
    shadow: {
      blur: 8,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0, 0, 0, 0.7)',
    },
    stroke: {
      width: 3,
      color: '#8B4513', // ダークブラウン
    },
  },
  'renaissance': {
    fontFamily: 'EB Garamond',
    fontWeight: 600,
    color: '#2F2F2F', // ダークグレー
    shadow: {
      blur: 4,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.5)',
    },
  },
  'impressionist': {
    fontFamily: 'Dancing Script',
    fontWeight: 'bold',
    color: '#7FB3D5', // ソフトブルー
    shadow: {
      blur: 6,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(255, 255, 255, 0.6)',
    },
    stroke: {
      width: 2,
      color: '#FFFFFF',
    },
  },
  'stained-glass': {
    fontFamily: 'UnifrakturMaguntia',
    fontWeight: 'normal',
    color: '#DAA520', // ゴールド
    shadow: {
      blur: 10,
      offsetX: 3,
      offsetY: 3,
      color: 'rgba(0, 0, 0, 0.8)',
    },
    stroke: {
      width: 4,
      color: '#000000',
    },
  },
  'art-nouveau': {
    fontFamily: 'Libre Baskerville',
    fontWeight: 'normal',
    color: '#C9A96E', // クリーム
    shadow: {
      blur: 5,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(93, 78, 55, 0.6)',
    },
  },

  // 日本画風 (Japanese)
  'watercolor': {
    fontFamily: 'Shippori Mincho',
    fontWeight: 500,
    color: '#2E86AB', // 深いブルー
    shadow: {
      blur: 3,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.3)',
    },
  },
  'ukiyo-e': {
    fontFamily: 'Kaisei Decol',
    fontWeight: 'bold',
    color: '#1A3A5C', // インディゴ
    stroke: {
      width: 2,
      color: '#C9B037', // ゴールド
    },
  },
  'sumi-e': {
    fontFamily: 'Noto Serif JP',
    fontWeight: 600,
    color: '#2C2C2C', // 墨黒
    shadow: {
      blur: 2,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.4)',
    },
  },

  // ポップ/イラスト風 (Pop)
  'anime': {
    fontFamily: 'M PLUS Rounded 1c',
    fontWeight: 'bold',
    color: '#F8B500', // イエロー
    stroke: {
      width: 4,
      color: '#000000',
    },
    shadow: {
      blur: 6,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0, 0, 0, 0.7)',
    },
  },
  'ghibli': {
    fontFamily: 'Kosugi Maru',
    fontWeight: 'normal',
    color: '#4CAF50', // グリーン
    shadow: {
      blur: 4,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.5)',
    },
    stroke: {
      width: 2,
      color: '#FFFFFF',
    },
  },
  'pop-art': {
    fontFamily: 'Bebas Neue',
    fontWeight: 'normal',
    color: '#FF1493', // ホットピンク
    stroke: {
      width: 5,
      color: '#000000',
    },
  },
  'hand-drawn': {
    fontFamily: 'Caveat',
    fontWeight: 'bold',
    color: '#2C3E50', // チャコール
    shadow: {
      blur: 3,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.4)',
    },
  },

  // なりきり風 (Narikiri)
  'pet-royalty': {
    fontFamily: 'Playfair Display',
    fontWeight: 'bold',
    color: '#DAA520', // ゴールド
    shadow: {
      blur: 8,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0, 0, 0, 0.7)',
    },
    stroke: {
      width: 3,
      color: '#722F37', // ダークレッド
    },
  },
  'pet-samurai': {
    fontFamily: 'Yuji Boku',
    fontWeight: 'normal',
    color: '#C9B037', // ゴールド
    stroke: {
      width: 3,
      color: '#000000',
    },
    shadow: {
      blur: 6,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(0, 0, 0, 0.7)',
    },
  },
  'pet-fairy': {
    fontFamily: 'Pacifico',
    fontWeight: 'normal',
    color: '#FFD700', // ゴールド
    glow: {
      color: 'rgba(255, 182, 193, 0.8)', // ピンク
      blur: 15,
    },
    shadow: {
      blur: 4,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(230, 230, 250, 0.6)',
    },
  },
  'kids-princess': {
    fontFamily: 'Great Vibes',
    fontWeight: 'normal',
    color: '#FFD700', // ゴールド
    glow: {
      color: 'rgba(255, 182, 193, 0.8)', // ピンク
      blur: 12,
    },
    shadow: {
      blur: 5,
      offsetX: 2,
      offsetY: 2,
      color: 'rgba(221, 160, 221, 0.5)',
    },
  },

  // デジタル (Digital)
  'pixel-art': {
    fontFamily: 'Press Start 2P',
    fontWeight: 'normal',
    color: '#FFFFFF', // ホワイト
    stroke: {
      width: 3,
      color: '#000000',
    },
  },
  'vector': {
    fontFamily: 'Poppins',
    fontWeight: 600,
    color: '#6C5CE7', // パープル
    shadow: {
      blur: 4,
      offsetX: 1,
      offsetY: 1,
      color: 'rgba(0, 0, 0, 0.3)',
    },
  },
};

/**
 * フォールバック用のデフォルトフォント設定
 * スタイルIDが見つからない場合に使用
 */
export const defaultPortraitFont: PortraitFontConfig = {
  fontFamily: 'Noto Sans JP',
  fontWeight: 'bold',
  color: '#FFFFFF',
  stroke: {
    width: 3,
    color: '#000000',
  },
  shadow: {
    blur: 5,
    offsetX: 2,
    offsetY: 2,
    color: 'rgba(0, 0, 0, 0.7)',
  },
};

/**
 * スタイルIDに対応するフォント設定を取得
 * @param styleId アートスタイルID
 * @returns フォント設定
 */
export function getPortraitFont(styleId: string): PortraitFontConfig {
  return portraitFonts[styleId] || defaultPortraitFont;
}
