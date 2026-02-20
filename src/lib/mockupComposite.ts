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
 * @returns 合成結果の data URL。該当する設定がなければ null。
 */
export async function compositeOnMockup(
  portraitUrl: string,
  productId: string,
): Promise<string | null> {
  const config = MOCKUP_CONFIGS[productId];
  if (!config) return null;

  const [mockupImg, portraitImg] = await Promise.all([
    loadImage(config.imagePath),
    loadImage(portraitUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.width;
  canvas.height = mockupImg.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 1) モックアップを背景として描画
  ctx.drawImage(mockupImg, 0, 0);

  // 2) リージョンにクリップして肖像画を重ねる
  //    モックアップのフレーム部分はクリップ外のため維持される
  const rx = Math.round(config.region.x * canvas.width);
  const ry = Math.round(config.region.y * canvas.height);
  const rw = Math.round(config.region.width * canvas.width);
  const rh = Math.round(config.region.height * canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(portraitImg, rx, ry, rw, rh);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // GPU バックバッファと Image デコードバッファを即座に解放
  canvas.width = 0;
  canvas.height = 0;
  mockupImg.src = '';
  portraitImg.src = '';

  return dataUrl;
}
