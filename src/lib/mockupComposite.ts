/**
 * モックアップ合成ユーティリティ
 *
 * Canvas API を使い、生成された肖像画をモックアップテンプレートに
 * はめ込んだ合成画像を生成する。
 * モックアップ画像を背景に描画し、指定リージョンにクリップして肖像画を重ねる。
 */

/** 肖像画を配置する領域（モックアップ画像サイズに対する割合 0–1） */
interface MockupRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MockupConfig {
  imagePath: string;
  region: MockupRegion;
}

/** compositeOnMockup のオプション */
export interface CompositeOptions {
  /** 出力画像の最大辺サイズ (px)。省略時はモックアップ画像の実寸 */
  maxSize?: number;
}

/**
 * 商品 ID → モックアップ設定のマップ
 * region はモックアップ画像の幅・高さに対する割合で指定
 *
 * 商品 ID は shared/catalog.ts の CatalogProduct.id と一致させること
 */
const MOCKUP_CONFIGS: Record<string, MockupConfig> = {
  'acrylic-stand': {
    imagePath: '/images/mock-up/acrylic-stand.png',
    region: { x: 0.255, y: 0.095, width: 0.49, height: 0.645 },
  },
  canvas: {
    imagePath: '/images/mock-up/canvas.png',
    region: { x: 0.215, y: 0.04, width: 0.57, height: 0.72 },
  },
};

/** 指定商品にモックアップ設定があるかを返す */
export function hasMockupConfig(productId: string): boolean {
  return productId in MOCKUP_CONFIGS;
}

/** 画像を読み込むヘルパー（タイムアウト付き） */
function loadImage(src: string, timeoutMs = 10_000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error(`Image load timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      const srcPreview = src.length > 100 ? `${src.slice(0, 100)}...` : src;
      reject(new Error(`Failed to load image: ${srcPreview}`));
    };
    img.src = src;
  });
}

/**
 * 生成画像をモックアップテンプレートに合成する
 *
 * @param portraitUrl 肖像画の data URL または画像 URL
 * @param productId  商品 ID（MOCKUP_CONFIGS のキー）
 * @param options    出力サイズ等のオプション
 * @returns 合成結果の data URL。該当する設定がなければ null。
 */
export async function compositeOnMockup(
  portraitUrl: string,
  productId: string,
  options?: CompositeOptions,
): Promise<string | null> {
  const config = MOCKUP_CONFIGS[productId];
  if (!config) return null;

  const [mockupImg, portraitImg] = await Promise.all([
    loadImage(config.imagePath),
    loadImage(portraitUrl),
  ]);

  // B: 出力サイズのスケーリング
  const maxSize = options?.maxSize;
  const scale = maxSize
    ? Math.min(1, maxSize / Math.max(mockupImg.width, mockupImg.height))
    : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(mockupImg.width * scale);
  canvas.height = Math.round(mockupImg.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 1) モックアップを背景として描画（スケール適用）
  ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);

  // 2) リージョン座標を算出（スケール後のキャンバスサイズ基準）
  const rx = Math.round(config.region.x * canvas.width);
  const ry = Math.round(config.region.y * canvas.height);
  const rw = Math.round(config.region.width * canvas.width);
  const rh = Math.round(config.region.height * canvas.height);

  // A: アスペクト比を保持してリージョン内に中央配置
  const imgAspect = portraitImg.width / portraitImg.height;
  const regionAspect = rw / rh;

  let drawX: number, drawY: number, drawW: number, drawH: number;
  if (imgAspect > regionAspect) {
    // 画像がリージョンより横長 → 幅に合わせる
    drawW = rw;
    drawH = rw / imgAspect;
    drawX = rx;
    drawY = ry + (rh - drawH) / 2;
  } else {
    // 画像がリージョンより縦長または同比率 → 高さに合わせる
    drawH = rh;
    drawW = rh * imgAspect;
    drawX = rx + (rw - drawW) / 2;
    drawY = ry;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(portraitImg, drawX, drawY, drawW, drawH);
  ctx.restore();

  // DEV: リージョン境界を赤枠で表示（座標調整用）
  if (import.meta.env.DEV) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.strokeRect(rx, ry, rw, rh);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // GPU バックバッファと Image デコードバッファを即座に解放
  canvas.width = 0;
  canvas.height = 0;
  mockupImg.src = '';
  portraitImg.src = '';

  return dataUrl;
}
