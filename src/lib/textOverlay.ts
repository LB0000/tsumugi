import { getPortraitFont, type PortraitFontConfig } from '../data/portraitFonts';

export interface TextOverlayOptions {
  /** 表示するテキスト（名前） */
  text: string;
  /** アートスタイルID */
  styleId: string;
  /** 画像の幅（px） */
  imageWidth: number;
  /** 画像の高さ（px） */
  imageHeight: number;
}

/**
 * ベース画像にテキストオーバーレイを適用
 * @param baseImageDataUrl ベース画像のdata URL
 * @param options オーバーレイオプション
 * @returns テキスト入りの新しい画像data URL
 */
export async function applyTextOverlay(
  baseImageDataUrl: string,
  options: TextOverlayOptions
): Promise<string> {
  const { text, styleId } = options;

  // 空欄の場合は元の画像をそのまま返す
  if (!text || text.trim() === '') {
    return baseImageDataUrl;
  }

  return new Promise((resolve, reject) => {
    // Canvas要素を作成
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // 画像をロード
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Canvasサイズを画像サイズに設定
        canvas.width = img.width;
        canvas.height = img.height;

        // ベース画像を描画
        ctx.drawImage(img, 0, 0);

        // フォント設定を取得
        const fontConfig = getPortraitFont(styleId);

        // テキストをレンダリング
        renderText(ctx, text, fontConfig, canvas.width, canvas.height);

        // 新しい画像data URLを生成
        const newDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(newDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load base image'));
    };

    img.src = baseImageDataUrl;
  });
}

/**
 * Canvasにテキストをレンダリング
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontConfig: PortraitFontConfig,
  canvasWidth: number,
  canvasHeight: number
): void {
  // レスポンシブなフォントサイズを計算
  const baseFontSize = calculateFontSize(canvasWidth, canvasHeight, text.length);

  // フォントを設定
  const fontWeight = typeof fontConfig.fontWeight === 'number'
    ? fontConfig.fontWeight
    : fontConfig.fontWeight;
  ctx.font = `${fontWeight} ${baseFontSize}px "${fontConfig.fontFamily}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // テキスト描画位置（画像下部中央、5%パディング）
  const x = canvasWidth / 2;
  const y = canvasHeight - (canvasHeight * 0.05) - baseFontSize / 2;

  // グロー効果（あれば）
  if (fontConfig.glow) {
    ctx.save();
    ctx.shadowBlur = fontConfig.glow.blur;
    ctx.shadowColor = fontConfig.glow.color;
    ctx.fillStyle = fontConfig.glow.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 影（あれば）
  if (fontConfig.shadow) {
    ctx.save();
    ctx.shadowBlur = fontConfig.shadow.blur;
    ctx.shadowOffsetX = fontConfig.shadow.offsetX;
    ctx.shadowOffsetY = fontConfig.shadow.offsetY;
    ctx.shadowColor = fontConfig.shadow.color;
    ctx.fillStyle = fontConfig.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 縁取り（あれば）
  if (fontConfig.stroke) {
    ctx.strokeStyle = fontConfig.stroke.color;
    ctx.lineWidth = fontConfig.stroke.width;
    ctx.strokeText(text, x, y);
  }

  // メインテキスト
  ctx.fillStyle = fontConfig.color;
  ctx.fillText(text, x, y);
}

/**
 * 画像サイズと文字数に応じてフォントサイズを計算
 * @param width Canvas幅
 * @param height Canvas高さ
 * @param textLength テキストの長さ
 * @returns フォントサイズ（px）
 */
function calculateFontSize(width: number, _height: number, textLength: number): number {
  // ベースサイズ：画像幅の5%
  const baseSize = width * 0.05;

  // 文字数に応じて調整（長いテキストは小さく）
  let adjustedSize = baseSize;
  if (textLength > 15) {
    adjustedSize = baseSize * 0.7;
  } else if (textLength > 10) {
    adjustedSize = baseSize * 0.8;
  } else if (textLength > 5) {
    adjustedSize = baseSize * 0.9;
  }

  // 最小値: 10px、最大値: 100px
  return Math.max(10, Math.min(100, adjustedSize));
}

/**
 * フォントが読み込まれるまで待機
 * @param fontFamily フォント名
 * @param timeout タイムアウト（ms）
 */
export async function waitForFontLoad(
  fontFamily: string,
  timeout: number = 3000
): Promise<boolean> {
  if (!('fonts' in document)) {
    // Font Loading API未対応の場合は待機せずに続行
    return true;
  }

  try {
    await Promise.race([
      document.fonts.load(`16px "${fontFamily}"`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Font load timeout')), timeout)
      )
    ]);
    return true;
  } catch (error) {
    console.warn(`Failed to load font "${fontFamily}":`, error);
    // フォント読み込み失敗でもシステムフォントフォールバックで続行
    return false;
  }
}

/**
 * 複数フォントの読み込みを待機
 * @param fontFamilies フォント名の配列
 */
export async function waitForFontsLoad(fontFamilies: string[]): Promise<void> {
  await Promise.all(fontFamilies.map(font => waitForFontLoad(font)));
}
