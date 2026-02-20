import sharp from 'sharp';
import { logger } from './logger.js';

interface WatermarkOptions {
  text?: string;
  opacity?: number;
  rotation?: number;
  fontSizeRatio?: number;
}

const DEFAULTS = {
  text: 'TSUMUGI',
  opacity: 0.15,
  rotation: -30,
  fontSizeRatio: 0.03,
} as const;

/**
 * Creates an SVG with a tiled diagonal text pattern for watermarking.
 */
function createWatermarkSvg(
  width: number,
  height: number,
  options: Required<WatermarkOptions>,
): string {
  const fontSize = Math.max(16, Math.round(width * options.fontSizeRatio));
  const spacingX = fontSize * 8;
  const spacingY = fontSize * 4;

  // Extend coverage area beyond image bounds to account for rotation
  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));
  const offsetX = Math.ceil((diagonal - width) / 2);
  const offsetY = Math.ceil((diagonal - height) / 2);

  // Shadow layer first, then white text on top for correct layering
  const shadows: string[] = [];
  const whites: string[] = [];
  for (let y = -offsetY; y < height + offsetY; y += spacingY) {
    for (let x = -offsetX; x < width + offsetX; x += spacingX) {
      shadows.push(
        `<text x="${x + 1}" y="${y + 1}" font-family="sans-serif" font-size="${fontSize}" font-weight="600" fill="black" opacity="${options.opacity * 0.5}">${options.text}</text>`,
      );
      whites.push(
        `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" font-weight="600" fill="white" opacity="${options.opacity}">${options.text}</text>`,
      );
    }
  }

  const centerX = width / 2;
  const centerY = height / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g transform="rotate(${options.rotation}, ${centerX}, ${centerY})">
    ${shadows.join('\n    ')}
    ${whites.join('\n    ')}
  </g>
</svg>`;
}

/**
 * Parses a base64 data URL into a Buffer and MIME type.
 */
export function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  if (!match) return null;

  const [, mimeType, base64Data] = match;
  try {
    return { buffer: Buffer.from(base64Data, 'base64'), mimeType };
  } catch {
    return null;
  }
}

/**
 * Converts a Buffer back to a base64 data URL.
 */
export function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Applies a tiled diagonal text watermark to an image buffer.
 *
 * @returns Watermarked image buffer, or null if processing fails.
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  mimeType: string,
  options?: WatermarkOptions,
): Promise<Buffer | null> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width ?? 1024;
    const height = metadata.height ?? 1024;

    const resolved: Required<WatermarkOptions> = {
      text: options?.text ?? DEFAULTS.text,
      opacity: options?.opacity ?? DEFAULTS.opacity,
      rotation: options?.rotation ?? DEFAULTS.rotation,
      fontSizeRatio: options?.fontSizeRatio ?? DEFAULTS.fontSizeRatio,
    };

    const svgOverlay = createWatermarkSvg(width, height, resolved);
    const svgBuffer = Buffer.from(svgOverlay);

    const outputFormat = mimeType === 'image/png' ? 'png' : 'jpeg';
    const outputOptions = outputFormat === 'jpeg' ? { quality: 92 } : {};

    const result = await sharp(imageBuffer)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .toFormat(outputFormat, outputOptions)
      .toBuffer();

    return result;
  } catch (error) {
    logger.error('Failed to apply watermark', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
