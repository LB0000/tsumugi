export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    type: 'digital' | 'physical' | 'addon';
    image?: string; // 将来的に商品画像のパスを入れる
}

export const products: Product[] = [
    {
        id: 'download',
        name: '高解像度画像データ',
        price: 2900,
        description: 'スマホの待ち受けやSNSアイコンに最適。メールでお届けします。',
        type: 'digital'
    },
    {
        id: 'acrylic-stand',
        name: 'アクリルスタンド',
        price: 3900,
        description: 'デスクや棚に飾れる透明感のある仕上がり。一番人気の商品です。',
        type: 'physical'
    },
    {
        id: 'canvas',
        name: 'キャンバスアート',
        price: 4900,
        description: '本物のキャンバス地で美術館のような質感を。特別な一枚に。',
        type: 'physical'
    }
];

export const crossSellProducts: Product[] = [
    {
        id: 'postcard',
        name: '特製ポストカード（5枚組）',
        price: 1500,
        description: '大切な人への贈り物や、お部屋のアクセントに。',
        type: 'addon'
    }
];
