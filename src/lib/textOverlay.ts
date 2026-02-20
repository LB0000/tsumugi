import { getPortraitFont, type PortraitFontConfig } from '../data/portraitFonts';
import type { TextPosition } from '../types/textOverlay';

export interface TextOverlayOptions {
  /** 表示するテキスト（名前） */
  text: string;
  /** アートスタイルID */
  styleId: string;
  /** 画像の幅（px） */
  imageWidth: number;
  /** 画像の高さ（px） */
  imageHeight: number;
  /** カスタムフォント（指定時はスタイル推奨を上書き） */
  customFont?: {
    fontFamily: string;
    fontWeight: string | number;
  };
  /** カスタム装飾（指定時はスタイル推奨を上書き） */
  customDecoration?: {
    color: string;
    shadow?: PortraitFontConfig['shadow'];
    stroke?: PortraitFontConfig['stroke'];
    glow?: PortraitFontConfig['glow'];
  };
  /** テキスト位置 */
  position?: TextPosition;
}

interface PositionResult {
  x: number;
  y: number;
  textAlign: CanvasTextAlign;
}

/**
 * テキスト位置プリセットに基づいて描画座標を計算
 */
function calculatePosition(
  position: TextPosition,
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number
): PositionResult {
  const padding = canvasHeight * 0.05;
  const halfFont = fontSize / 2;
  const sidePadding = canvasWidth * 0.05;

  switch (position) {
    case 'bottom-left':
      return { x: sidePadding, y: canvasHeight - padding - halfFont, textAlign: 'left' };
    case 'bottom-right':
      return { x: canvasWidth - sidePadding, y: canvasHeight - padding - halfFont, textAlign: 'right' };
    case 'top-center':
      return { x: canvasWidth / 2, y: padding + halfFont, textAlign: 'center' };
    case 'top-left':
      return { x: sidePadding, y: padding + halfFont, textAlign: 'left' };
    case 'top-right':
      return { x: canvasWidth - sidePadding, y: padding + halfFont, textAlign: 'right' };
    case 'bottom-center':
    default:
      return { x: canvasWidth / 2, y: canvasHeight - padding - halfFont, textAlign: 'center' };
  }
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
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // フォント設定を解決（カスタム > スタイル推奨）
        const styleFontConfig = getPortraitFont(styleId);
        const resolvedConfig = resolveConfig(styleFontConfig, options);

        renderText(ctx, text, resolvedConfig, canvas.width, canvas.height, options.position ?? 'bottom-center');

        const newDataUrl = canvas.toDataURL('image/jpeg', 0.95);

        // GPU バックバッファと Image デコードバッファを解放
        canvas.width = 0;
        canvas.height = 0;
        img.src = '';

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
 * カスタム設定とスタイル推奨設定をマージ
 */
function resolveConfig(
  styleConfig: PortraitFontConfig,
  options: TextOverlayOptions
): PortraitFontConfig {
  const { customFont, customDecoration } = options;

  return {
    fontFamily: customFont?.fontFamily ?? styleConfig.fontFamily,
    fontWeight: customFont?.fontWeight ?? styleConfig.fontWeight,
    color: customDecoration?.color ?? styleConfig.color,
    shadow: customDecoration ? customDecoration.shadow : styleConfig.shadow,
    stroke: customDecoration ? customDecoration.stroke : styleConfig.stroke,
    glow: customDecoration ? customDecoration.glow : styleConfig.glow,
  };
}

/**
 * Canvasにテキストをレンダリング
 *
 * Note: Canvas操作は同期的に実行すべき（コンテキストの有効性保証のため）
 * 呼び出し元の useTextOverlay フックが既にデバウンス処理を実施しているため、
 * ここでのスケジューリングは不要
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontConfig: PortraitFontConfig,
  canvasWidth: number,
  canvasHeight: number,
  position: TextPosition
): void {
  const baseFontSize = calculateFontSize(canvasWidth, canvasHeight, text.length);

  const fontWeight = fontConfig.fontWeight;
  ctx.font = `${fontWeight} ${baseFontSize}px "${fontConfig.fontFamily}", sans-serif`;
  ctx.textBaseline = 'middle';

  // 位置プリセットに基づいて座標・テキスト揃えを設定
  const { x, y, textAlign } = calculatePosition(position, canvasWidth, canvasHeight, baseFontSize);
  ctx.textAlign = textAlign;

  // グロー効果
  if (fontConfig.glow) {
    ctx.save();
    ctx.shadowBlur = fontConfig.glow.blur;
    ctx.shadowColor = fontConfig.glow.color;
    ctx.fillStyle = fontConfig.glow.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 影
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

  // 縁取り
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
 */
function calculateFontSize(width: number, _height: number, textLength: number): number {
  const baseSize = width * 0.05;

  let adjustedSize = baseSize;
  if (textLength > 15) {
    adjustedSize = baseSize * 0.7;
  } else if (textLength > 10) {
    adjustedSize = baseSize * 0.8;
  } else if (textLength > 5) {
    adjustedSize = baseSize * 0.9;
  }

  return Math.max(10, Math.min(100, adjustedSize));
}

/**
 * フォントが読み込まれるまで待機
 */
export async function waitForFontLoad(
  fontFamily: string,
  timeout: number = 3000
): Promise<boolean> {
  if (!('fonts' in document)) {
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
    return false;
  }
}

/**
 * 複数フォントの読み込みを待機
 */
export async function waitForFontsLoad(fontFamilies: string[]): Promise<void> {
  await Promise.all(fontFamilies.map(font => waitForFontLoad(font)));
}
