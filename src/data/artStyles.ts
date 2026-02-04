import type { ArtStyle } from '../types';

export const artStyles: ArtStyle[] = [
  {
    id: 'intelligent',
    name: 'インテリジェント',
    description: 'AIがあなたの写真に最適なスタイルを自動選択',
    thumbnailUrl: '',
    colorPalette: [],
    isIntelligent: true,
    tier: 'free',
    category: 'other',
    tags: ['AI', '自動', 'おすすめ']
  },
  {
    id: 'baroque-red',
    name: 'バロック・レッド',
    description: '豪華なベルベットと金色のバロック額縁を用いた古典的な王室肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free',
    category: 'western-classic',
    tags: ['豪華', '王室', '古典', 'ベルベット', '金']
  },
  {
    id: 'florentine-renaissance',
    name: 'フィレンツェ・ルネサンス',
    description: '洗練された筆遣いと古典的構図による永遠のエレガンス',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western-classic',
    tags: ['エレガント', '古典', 'フィレンツェ', 'イタリア']
  },
  {
    id: 'renaissance-sky',
    name: 'ルネサンス・スカイ',
    description: 'ドラマチックな照明と巨匠のテクニックによる雰囲気あふれるルネサンススタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#4682B4', '#87CEEB', '#2F4F4F', '#F0E68C'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western-classic',
    tags: ['ドラマチック', '空', '照明', '巨匠']
  },
  {
    id: 'rococo',
    name: 'ロココ',
    description: '大胆な筆遣いと豊かな色彩による鮮やかな絵画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#4169E1', '#DC143C', '#FFD700', '#228B22'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western-classic',
    tags: ['華やか', '豊か', '鮮やか', 'フランス']
  },
  {
    id: 'dutch-golden',
    name: 'オランダ黄金時代',
    description: 'レンブラントとフェルメールにインスパイアされた豊かな明暗法',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#3D2314', '#8B7355', '#DAA520', '#1C1C1C'],
    isIntelligent: false,
    tier: 'studio',
    category: 'western-classic',
    tags: ['レンブラント', 'フェルメール', '明暗法', 'オランダ']
  },
  {
    id: 'venetian',
    name: 'ヴェネツィアン',
    description: 'ヴェネツィアの巨匠たちの温かみのある輝く色彩と官能的な筆遣い',
    thumbnailUrl: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#C41E3A', '#FFD700', '#006994', '#8B4513'],
    isIntelligent: false,
    tier: 'studio',
    category: 'western-classic',
    tags: ['ヴェネツィア', '温かみ', '輝き', 'イタリア']
  },
  {
    id: 'neoclassical',
    name: '新古典主義',
    description: '古代ギリシャ・ローマにインスパイアされた優雅なシンプルさと理想化された美',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#F5F5DC', '#708090', '#CD853F', '#2F4F4F'],
    isIntelligent: false,
    tier: 'studio',
    category: 'modern',
    tags: ['ギリシャ', 'ローマ', '優雅', 'シンプル']
  },
  {
    id: 'watercolor',
    name: '水彩画',
    description: '繊細な筆遣いと淡い色彩による日本の水彩画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#E8F4F8', '#B8D4E3', '#7FB3D5', '#2E86AB'],
    isIntelligent: false,
    tier: 'starter',
    category: 'japanese',
    tags: ['水彩', '繊細', '淡い', '日本']
  },
  {
    id: 'anime',
    name: 'アニメ・イラスト',
    description: 'ジャパニーズアニメスタイルの鮮やかなイラストレーション',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF6B9D', '#C44569', '#F8B500', '#00D9FF'],
    isIntelligent: false,
    tier: 'starter',
    category: 'japanese',
    tags: ['アニメ', 'イラスト', '鮮やか', 'ポップ']
  },
  {
    id: 'japanese-modern',
    name: '和モダン',
    description: '伝統的な日本美術と現代デザインの融合',
    thumbnailUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2D3436', '#DFE6E9', '#D4A373', '#E07A5F'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['和', 'モダン', '融合', '現代']
  },
  {
    id: 'ukiyo-e',
    name: '浮世絵',
    description: '江戸時代の木版画スタイルによる伝統的な浮世絵',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#1A3A5C', '#C9B037', '#E8D5B7', '#8B4513'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['浮世絵', '江戸', '木版画', '伝統']
  }
];
