import { allCatalogProducts, type CatalogProduct } from '../../shared/catalog.js';

export type CatalogItem = CatalogProduct;

export const catalogById = new Map(allCatalogProducts.map((item) => [item.id, item]));

export { SHIPPING_FREE_THRESHOLD, SHIPPING_FLAT_FEE, DISCOUNT_RATE, DISCOUNT_WINDOW_MS } from '../../shared/catalog.js';

/**
 * [M2] LYLY PDF Template Mapping
 *
 * Maps TSUMUGI product IDs to LYLY template product titles.
 * Used for CSV generation in LYLY PDF print data system.
 *
 * NOTE: 'download' product is excluded (digital-only, no PDF needed)
 */
export const LYLY_PRODUCT_TITLE_MAP: Record<string, string> = {
  'acrylic-stand': 'TSUMUGI アクリルスタンド',
  'canvas': 'TSUMUGI キャンバスアート',
  'phone-case': 'TSUMUGI スマホケース',
  'postcard': 'TSUMUGI ポストカード',
};
