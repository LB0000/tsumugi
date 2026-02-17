export interface TransformationSample {
  id: string;
  beforeImage: string;
  afterImage: string;
  style: string;
  customerName: string;
  size: 'large' | 'medium';
  position: { x: string; y: string };
  mobilePosition: { x: string; y: string };
  revealDelay: number;
  rotation: number;
}

export const categorySamples: Record<string, TransformationSample[]> = {
  pets: [
    {
      id: 'dog',
      beforeImage: '/images/hero/dog-before.webp',
      afterImage: '/images/hero/dog-after.webp',
      style: '浮世絵風',
      customerName: '田中様の愛犬',
      size: 'large',
      position: { x: '3%', y: '3%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3,
    },
    {
      id: 'cat',
      beforeImage: '/images/hero/cat-before.webp',
      afterImage: '/images/hero/cat-after.webp',
      style: 'アニメ・イラスト風',
      customerName: '佐藤様の猫',
      size: 'medium',
      position: { x: '41%', y: '37%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4,
    },
  ],
  family: [
    {
      id: 'family1',
      beforeImage: '/images/hero/family-before.webp',
      afterImage: '/images/hero/family-after.webp',
      style: '古典名画',
      customerName: '山田家の肖像',
      size: 'large',
      position: { x: '3%', y: '3%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3,
    },
    {
      id: 'family2',
      beforeImage: '/images/hero/family2-before.webp',
      afterImage: '/images/hero/family2-after.webp',
      style: '豪華油絵',
      customerName: '鈴木家の思い出',
      size: 'medium',
      position: { x: '41%', y: '37%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4,
    },
  ],
  kids: [
    {
      id: 'kid1',
      beforeImage: '/images/hero/kids-before.webp',
      afterImage: '/images/hero/kids-after.webp',
      style: 'ロココ',
      customerName: 'ゆいちゃんの肖像',
      size: 'large',
      position: { x: '3%', y: '3%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3,
    },
    {
      id: 'kid2',
      beforeImage: '/images/hero/kids2-before.webp',
      afterImage: '/images/hero/kids2-after.webp',
      style: 'アニメ・イラスト風',
      customerName: 'けんたくんの冒険',
      size: 'medium',
      position: { x: '41%', y: '37%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4,
    },
  ],
};
