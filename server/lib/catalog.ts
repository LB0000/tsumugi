import { allCatalogProducts, type CatalogProduct } from '../../shared/catalog.js';

export type CatalogItem = CatalogProduct;

export const catalogById = new Map(allCatalogProducts.map((item) => [item.id, item]));

export { SHIPPING_FREE_THRESHOLD, SHIPPING_FLAT_FEE, DISCOUNT_RATE, DISCOUNT_WINDOW_MS } from '../../shared/catalog.js';
