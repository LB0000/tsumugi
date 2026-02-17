import type { Category } from '../types';

export const categories: Category[] = [
  {
    id: 'pets',
    name: 'ペット',
    headline: 'うちの子が、名画の主人公に',
    heroDescription: 'いつもそばにいてくれる大切な家族を、世界にひとつの肖像画に。リビングに飾るたびに、思わず目が合って微笑んでしまう一枚を。',
    uploadHint: 'ペットの顔がはっきり写った写真をアップロード',
    trustText: '10,000人以上のペットオーナーに選ばれています',
    sampleImages: [
      '/images/hero/dog-before.webp',
      '/images/hero/cat-before.webp',
      '/images/styles/pet/pet-royalty.webp'
    ],
  },
  {
    id: 'family',
    name: 'ファミリー',
    headline: '家族の笑顔が、一枚の芸術になる',
    heroDescription: '何気ない家族写真が、格調高い肖像画に。額に入れて飾れば、家族みんなの自慢の一枚になります。',
    uploadHint: '人物やペットの写真を1枚以上アップロード',
    trustText: '1,000組以上のご家族に選ばれています',
    sampleImages: [
      '/images/hero/family-before.webp',
      '/images/hero/family2-before.webp',
      '/images/hero/family-after.webp'
    ],
  },
  {
    id: 'kids',
    name: 'キッズ・ベビー',
    headline: '今だけの表情を、一生の宝物に',
    heroDescription: '成長はあっという間。今しかないあどけない表情を、ずっと色あせない肖像画に残しませんか。',
    uploadHint: 'お子様やペットの写真を1枚以上アップロード',
    trustText: '1,000人以上の保護者に選ばれています',
    sampleImages: [
      '/images/hero/kids-before.webp',
      '/images/hero/kids2-before.webp',
      '/images/hero/kids-after.webp'
    ],
  }
];
