export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  requiresShipping: boolean;
}

const catalogItems: CatalogItem[] = [
  {
    id: 'download',
    name: '高解像度画像データ',
    price: 2900,
    requiresShipping: false,
  },
  {
    id: 'acrylic-stand',
    name: 'アクリルスタンド',
    price: 3900,
    requiresShipping: true,
  },
  {
    id: 'canvas',
    name: 'キャンバスアート',
    price: 4900,
    requiresShipping: true,
  },
  {
    id: 'postcard',
    name: '特製ポストカード（5枚組）',
    price: 1500,
    requiresShipping: true,
  },
];

export const catalogById = new Map(catalogItems.map((item) => [item.id, item]));

export const SHIPPING_FREE_THRESHOLD = 5000;
export const SHIPPING_FLAT_FEE = 500;
