export interface GiftWrappingOption {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface NoshiType {
  id: string;
  name: string;
}

export const giftWrappingOptions: GiftWrappingOption[] = [
  { id: 'standard', name: 'スタンダードラッピング', price: 0, description: '無料の上品なギフトボックス' },
  { id: 'premium', name: 'プレミアムラッピング', price: 500, description: 'リボン付き高級ギフトボックス' },
  { id: 'noshi', name: 'のし紙付き', price: 300, description: '慶事用のし紙（表書き選択可）' },
];

export const noshiTypes: NoshiType[] = [
  { id: 'oiwai', name: '御祝' },
  { id: 'kotobuki', name: '寿' },
  { id: 'orei', name: '御礼' },
  { id: 'kinen', name: '記念品' },
];
