export interface GalleryItem {
  id: string;
  beforeImage: string;
  afterImage: string;
  styleName: string;
  styleCategory: 'western' | 'japanese' | 'pop';
  subjectCategory: 'pets' | 'family' | 'kids';
  label: string;
}

export const galleryItems: GalleryItem[] = [
  // 西洋絵画
  {
    id: 'dog-baroque',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/hero/dog-after.jpeg',
    styleName: '王室の豪華肖像画',
    styleCategory: 'western',
    subjectCategory: 'pets',
    label: '田中様の愛犬',
  },
  {
    id: 'family-renaissance',
    beforeImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&h=600&fit=crop&q=80',
    afterImage: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=500&h=600&fit=crop&q=80',
    styleName: 'ダヴィンチ風クラシック',
    styleCategory: 'western',
    subjectCategory: 'family',
    label: '山田家の肖像',
  },
  {
    id: 'kid-impressionist',
    beforeImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&h=600&fit=crop&q=80',
    afterImage: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=500&h=600&fit=crop&q=80',
    styleName: '光のやわらか絵画',
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
    beforeImage: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=500&h=600&fit=crop&q=80',
    afterImage: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500&h=600&fit=crop&q=80',
    styleName: '水彩画',
    styleCategory: 'japanese',
    subjectCategory: 'family',
    label: '鈴木家の思い出',
  },
  {
    id: 'kid-sumie',
    beforeImage: 'https://images.unsplash.com/photo-1595967964979-0a0a3f6f8dbd?w=500&h=600&fit=crop&q=80',
    afterImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&h=600&fit=crop&q=80',
    styleName: '水墨画',
    styleCategory: 'japanese',
    subjectCategory: 'kids',
    label: 'けんたくんの肖像',
  },
  // ポップ・イラスト
  {
    id: 'dog-anime',
    beforeImage: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=500&fit=crop&q=80',
    styleName: 'アニメ',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '高橋様の愛犬',
  },
  {
    id: 'cat-ghibli',
    beforeImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=500&fit=crop&q=80',
    styleName: 'ジブリ風',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '中村様の猫',
  },
  {
    id: 'kid-popart',
    beforeImage: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=500&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=500&fit=crop&q=80',
    styleName: 'カラフルポップ',
    styleCategory: 'pop',
    subjectCategory: 'pets',
    label: '伊藤様の愛犬',
  },
];
