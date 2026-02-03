import type { Category } from '../types';

export const categories: Category[] = [
  {
    id: 'pets',
    name: 'ペット',
    headline: 'あなたのペットを永遠の名作に',
    subheadline: '無料プレビュー · ¥2,900から購入可能',
    uploadHint: 'ペットの顔がはっきり写った写真をアップロード',
    trustText: '10,000人以上のペットオーナーに選ばれています',
    basePrice: 2900,
    sampleImages: [
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=500&fit=crop'
    ]
  },
  {
    id: 'family',
    name: 'ファミリー',
    headline: '家族全員で、ひとつの傑作を',
    subheadline: '無料プレビュー · ¥4,900から購入可能',
    uploadHint: '人物やペットの写真を1枚以上アップロード',
    trustText: '1,000以上のご家族に選ばれています',
    basePrice: 4900,
    sampleImages: [
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=500&fit=crop'
    ]
  },
  {
    id: 'kids',
    name: 'キッズ',
    headline: 'お子様の美しい肖像画を作成',
    subheadline: '無料プレビュー · ¥4,900から購入可能',
    uploadHint: 'お子様やペットの写真を1枚以上アップロード',
    trustText: '1,000人以上の保護者に選ばれています',
    basePrice: 4900,
    sampleImages: [
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&h=500&fit=crop',
      'https://images.unsplash.com/photo-1595967964979-0a0a3f6f8dbd?w=400&h=500&fit=crop'
    ]
  }
];
