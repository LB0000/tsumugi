/**
 * 商品カタログ — Single Source of Truth (SSOT)
 *
 * フロントエンド (src/data/products.ts) とバックエンド (server/lib/catalog.ts) の
 * 両方がこのファイルからデータを取得します。
 * 価格・商品名を変更する場合はここだけを編集してください。
 */

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  type: 'digital' | 'physical' | 'addon';
  requiresShipping: boolean;
}

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'download',
    name: '高解像度画像データ',
    price: 2900,
    description: 'スマホの待ち受けやSNSアイコンに最適。メールでお届けします。',
    type: 'digital',
    requiresShipping: false,
  },
  {
    id: 'acrylic-stand',
    name: 'アクリルスタンド',
    price: 4500,
    description: 'デスクや棚に飾れる透明感のある仕上がり。一番人気の商品です。',
    type: 'physical',
    requiresShipping: true,
  },
  {
    id: 'canvas',
    name: 'キャンバスアート',
    price: 6900,
    description: '本物のキャンバス地で美術館のような質感を。特別な一枚に。',
    type: 'physical',
    requiresShipping: true,
  },
];

export const catalogCrossSellProducts: CatalogProduct[] = [
  {
    id: 'postcard',
    name: '特製ポストカード（5枚組）',
    price: 1500,
    description: '大切な人への贈り物や、お部屋のアクセントに。',
    type: 'addon',
    requiresShipping: true,
  },
];

export const allCatalogProducts: CatalogProduct[] = [
  ...catalogProducts,
  ...catalogCrossSellProducts,
];

export const SHIPPING_FREE_THRESHOLD = 5000;
export const SHIPPING_FLAT_FEE = 500;

/**
 * 24時間限定割引率（10%）
 * プレビュー生成から24時間以内の購入に適用される割引率
 */
export const DISCOUNT_RATE = 0.1;

/**
 * 24時間限定割引の有効期間（ミリ秒）
 */
export const DISCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;
