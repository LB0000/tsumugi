import {
    catalogProducts,
    catalogCrossSellProducts,
    type CatalogProduct,
} from '../../shared/catalog.ts';

export type Product = CatalogProduct;

export const products: Product[] = catalogProducts;

export const crossSellProducts: Product[] = catalogCrossSellProducts;
