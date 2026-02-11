import type { Category } from '../types';

export const categories: Category[] = [
  {
    id: 'pets',
    name: 'ペット',
    headline: 'うちの子が、名画の主人公に',
    subheadline: '無料プレビュー · ¥2,900から購入可能',
    heroDescription: 'いつもそばにいてくれる大切な家族を、世界にひとつの肖像画に。リビングに飾るたびに、思わず目が合って微笑んでしまう一枚を。',
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
    headline: '家族の笑顔が、一枚の芸術になる',
    subheadline: '無料プレビュー · ¥4,900から購入可能',
    heroDescription: '何気ない家族写真が、格調高い肖像画に。額に入れて飾れば、家族みんなの自慢の一枚になります。',
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
    headline: '今だけの表情を、一生の宝物に',
    subheadline: '無料プレビュー · ¥4,900から購入可能',
    heroDescription: '成長はあっという間。今しかないあどけない表情を、ずっと色あせない肖像画に残しませんか。',
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
