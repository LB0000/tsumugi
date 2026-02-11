import type { ArtStyle } from '../types';

export const artStyles: ArtStyle[] = [
  // 特別枠
  {
    id: 'intelligent',
    name: 'おまかせAI',
    description: 'AIがあなたの写真に最適なスタイルを自動選択',
    thumbnailUrl: '',
    colorPalette: [],
    isIntelligent: true,
    tier: 'free',
    category: 'western',
    tags: ['AI', '自動', 'おすすめ']
  },
  // 西洋絵画
  {
    id: 'baroque',
    name: '王室の豪華肖像画',
    description: '赤ベルベットと金の額縁で彩る、まるで王様みたいな豪華肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free',
    category: 'western',
    tags: ['豪華', '王室', '古典', '金']
  },
  {
    id: 'pet-royalty',
    name: 'うちの子 王族風',
    description: '王冠とマントをまとった、うちの子の威厳あふれるロイヤル肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#722F37', '#DAA520', '#4B0082', '#FFFACD'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western',
    tags: ['ペット', '王族', 'ロイヤル', '豪華', 'うちの子'],
    isNew: true,
    popularity: 92
  },
  {
    id: 'renaissance',
    name: 'ダヴィンチ風クラシック',
    description: 'ダヴィンチが描いたような、格調高い古典名画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western',
    tags: ['エレガント', '古典', 'イタリア', 'ダヴィンチ']
  },
  {
    id: 'impressionist',
    name: '光のやわらか絵画',
    description: 'モネやルノワールのような、光あふれるやわらかタッチの絵画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
    isIntelligent: false,
    tier: 'studio',
    category: 'western',
    tags: ['モネ', 'ルノワール', '光', '柔らか']
  },
  // 和風・東洋
  {
    id: 'watercolor',
    name: '水彩画',
    description: '繊細な筆遣いと淡い色彩による和風水彩画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545486332-9e0999c535b2?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#E8F4F8', '#B8D4E3', '#7FB3D5', '#2E86AB'],
    isIntelligent: false,
    tier: 'starter',
    category: 'japanese',
    tags: ['水彩', '繊細', '淡い', '和']
  },
  {
    id: 'ukiyo-e',
    name: '浮世絵',
    description: '北斎や広重のような伝統的な木版画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513569771920-c9e1d31714af?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#1A3A5C', '#C9B037', '#E8D5B7', '#8B4513'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['浮世絵', '北斎', '木版画', '伝統']
  },
  {
    id: 'sumi-e',
    name: '水墨画',
    description: '墨の濃淡で描く東洋の伝統画法',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C2C2C', '#696969', '#A9A9A9', '#F5F5F5'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['墨', '東洋', '伝統', 'モノクロ']
  },
  {
    id: 'pet-samurai',
    name: 'うちの子 武将',
    description: '鎧兜に身を包んだ、うちの子の勇ましい武将肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C2C2C', '#8B0000', '#C9B037', '#4A4A4A'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['ペット', '武将', '鎧', '和風', 'うちの子'],
    isNew: true,
    popularity: 88
  },
  // ポップ・イラスト
  {
    id: 'anime',
    name: 'アニメ',
    description: 'セル画風の鮮やかなアニメイラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF6B9D', '#C44569', '#F8B500', '#00D9FF'],
    isIntelligent: false,
    tier: 'free',
    category: 'pop',
    tags: ['アニメ', 'イラスト', '鮮やか', 'ポップ']
  },
  {
    id: 'ghibli',
    name: 'ジブリ風',
    description: '温かみのある手描き風アニメーション',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#4CAF50', '#8BC34A', '#FF9800', '#87CEEB'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['ジブリ', '手描き', '温かみ', 'ファンタジー']
  },
  {
    id: 'pet-fairy',
    name: 'うちの子 妖精',
    description: '花と光に囲まれた、うちの子のメルヘン妖精イラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FFB6C1', '#E6E6FA', '#98FB98', '#FFD700'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['ペット', '妖精', 'ファンタジー', 'メルヘン', 'うちの子'],
    isNew: true,
    popularity: 90
  },
  {
    id: 'pop-art',
    name: 'カラフルポップ',
    description: 'ビビッドな色でインパクト大！ウォーホル風ポップアート',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF1493', '#FFD700', '#00CED1', '#FF4500'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['ポップ', 'カラフル', 'ウォーホル', 'モダン']
  },
  {
    id: 'hand-drawn',
    name: '手描きスケッチ',
    description: '鉛筆や木炭で描いたような温かみのあるスケッチ風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C3E50', '#7F8C8D', '#BDC3C7', '#ECF0F1'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['手描き', 'スケッチ', '鉛筆', '木炭', 'ナチュラル'],
    isNew: true,
    popularity: 88
  },
  // 西洋絵画（追加）
  {
    id: 'stained-glass',
    name: '教会のステンドグラス',
    description: '教会のステンドグラスのように、光が透ける美しい装飾画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#E74C3C', '#3498DB', '#F39C12', '#2ECC71'],
    isIntelligent: false,
    tier: 'studio',
    category: 'western',
    tags: ['ステンドグラス', '教会', '装飾', '光', 'ゴシック'],
    isNew: true,
    popularity: 70
  },
  {
    id: 'art-nouveau',
    name: '花と曲線のエレガント',
    description: 'ミュシャのような花と優雅な曲線で彩るエレガントなポスター風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#C9A96E', '#8B6914', '#5D4E37', '#E8D5B7'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western',
    tags: ['アールヌーヴォー', 'ミュシャ', '曲線', '装飾', 'エレガント'],
    isNew: true,
    popularity: 80
  },
  // モダン・デジタル
  {
    id: 'pixel-art',
    name: 'レトロドット絵',
    description: 'なつかしのゲーム風！レトロかわいいドット絵肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    isIntelligent: false,
    tier: 'free',
    category: 'digital',
    tags: ['ピクセル', 'レトロ', 'ゲーム', 'ドット絵', '8bit'],
    isNew: true,
    popularity: 85
  },
  {
    id: '3d-illustration',
    name: 'ぷっくり3D',
    description: 'ピクサーみたいな、ぷっくりかわいい3Dキャラクター風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
    isIntelligent: false,
    tier: 'studio',
    category: 'digital',
    tags: ['3D', 'CG', 'Pixar', 'モダン', 'レンダリング'],
    isNew: true,
    popularity: 90
  },
  {
    id: 'vector',
    name: 'フラットイラスト',
    description: 'すっきりおしゃれなフラットデザインイラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#6C5CE7', '#00CECE', '#FD79A8', '#FDCB6E'],
    isIntelligent: false,
    tier: 'starter',
    category: 'digital',
    tags: ['ベクター', 'フラット', 'グラフィック', 'ミニマル'],
    isNew: true,
    popularity: 75
  }
];
