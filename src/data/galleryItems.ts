export interface GalleryItem {
  id: string;
  beforeImage: string;
  afterImage: string;
  styleName: string;
  styleCategory: 'narikiri' | 'western' | 'japanese' | 'pop';
  subjectCategory: 'pets' | 'family' | 'kids';
  label: string;
}

export const galleryItems: GalleryItem[] = [
  // なりきり
  {
    id: 'dog-royalty',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/styles/pet/pet-royalty.jpeg',
    styleName: '王族スタイル',
    styleCategory: 'narikiri',
    subjectCategory: 'pets',
    label: '高橋様の愛犬',
  },
  {
    id: 'cat-samurai',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/styles/pet/pet-samurai.jpeg',
    styleName: '武将スタイル',
    styleCategory: 'narikiri',
    subjectCategory: 'pets',
    label: '伊藤様の猫',
  },
  {
    id: 'kid-fairy',
    beforeImage: '/images/hero/kids-before.jpeg',
    afterImage: '/images/styles/pet/pet-fairy.jpeg',
    styleName: '妖精',
    styleCategory: 'narikiri',
    subjectCategory: 'kids',
    label: 'さくらちゃんの肖像',
  },
  // 西洋絵画
  {
    id: 'dog-baroque',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/hero/dog-after.jpeg',
    styleName: '豪華油絵',
    styleCategory: 'western',
    subjectCategory: 'pets',
    label: '田中様の愛犬',
  },
  {
    id: 'family-renaissance',
    beforeImage: '/images/hero/family-before.jpeg',
    afterImage: '/images/hero/family-after.jpeg',
    styleName: '古典名画',
    styleCategory: 'western',
    subjectCategory: 'family',
    label: '山田家の肖像',
  },
  {
    id: 'kid-impressionist',
    beforeImage: '/images/hero/kids-before.jpeg',
    afterImage: '/images/hero/kids-after.jpeg',
    styleName: 'やわらか絵画',
    styleCategory: 'western',
    subjectCategory: 'kids',
    label: 'ゆいちゃんの肖像',
  },
  // 和風・東洋
  {
    id: 'cat-ukiyoe',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/hero/cat-after.jpeg',
    styleName: '浮世絵',
    styleCategory: 'japanese',
    subjectCategory: 'pets',
    label: '佐藤様の猫',
  },
  {
    id: 'family-watercolor',
    beforeImage: '/images/hero/family2-before.jpeg',
    afterImage: '/images/hero/family2-after.jpeg',
    styleName: '水彩画',
    styleCategory: 'japanese',
    subjectCategory: 'family',
    label: '鈴木家の思い出',
  },
  {
    id: 'kid-sumie',
    beforeImage: '/images/hero/kids2-before.jpg',
    afterImage: '/images/hero/kids2-after.jpeg',
    styleName: '水墨画',
    styleCategory: 'japanese',
    subjectCategory: 'kids',
    label: 'けんたくんの肖像',
  },
  // ポップ・イラスト
  {
    id: 'dog-anime',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/styles/pet/anime.jpeg',
    styleName: 'アニメ',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '高橋様の愛犬',
  },
  {
    id: 'cat-ghibli',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/styles/pet/ghibli.jpeg',
    styleName: 'ジブリ風',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '中村様の猫',
  },
  {
    id: 'dog-popart',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/styles/pet/pop-art.jpeg',
    styleName: 'ポップアート',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '伊藤様の愛犬',
  },
];
