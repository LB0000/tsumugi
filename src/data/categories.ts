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
      '/images/hero/dog-before.jpg',
      '/images/hero/cat-before.jpg',
      '/images/styles/pet/pet-royalty.jpeg'
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
      '/images/hero/family-before.jpeg',
      '/images/hero/family2-before.jpeg',
      '/images/hero/family-after.jpeg'
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
      '/images/hero/kids-before.jpeg',
      '/images/hero/kids2-before.jpg',
      '/images/hero/kids-after.jpeg'
    ]
  }
];
