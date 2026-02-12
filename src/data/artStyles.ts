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
    name: '豪華油絵',
    description: '赤ベルベットと金の額縁で彩る、まるで王様みたいな豪華肖像画',
    thumbnailUrl: '/images/styles/pet/baroque.jpeg',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free',
    category: 'western',
    tags: ['豪華', '王室', '古典', '金']
  },
  {
    id: 'pet-royalty',
    name: '王族スタイル',
    description: '王冠とマントをまとった、威厳あふれるロイヤル肖像画',
    thumbnailUrl: '/images/styles/pet/pet-royalty.jpeg',
    colorPalette: ['#722F37', '#DAA520', '#4B0082', '#FFFACD'],
    isIntelligent: false,
    tier: 'starter',
    category: 'narikiri',
    tags: ['王族', 'ロイヤル', '豪華', 'なりきり'],
    isNew: true,
    popularity: 92
  },
  {
    id: 'renaissance',
    name: '古典名画',
    description: 'ダヴィンチが描いたような、格調高い古典名画スタイル',
    thumbnailUrl: '/images/styles/pet/renaissance.jpeg',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter',
    category: 'western',
    tags: ['エレガント', '古典', 'イタリア', 'ダヴィンチ']
  },
  {
    id: 'impressionist',
    name: 'やわらか絵画',
    description: 'モネやルノワールのような、光あふれるやわらかタッチの絵画',
    thumbnailUrl: '/images/styles/pet/impressionist.jpeg',
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
    thumbnailUrl: '/images/styles/pet/watercolor.jpeg',
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
    thumbnailUrl: '/images/styles/pet/ukiyo-e.jpeg',
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
    thumbnailUrl: '/images/styles/pet/sumi-e.jpeg',
    colorPalette: ['#2C2C2C', '#696969', '#A9A9A9', '#F5F5F5'],
    isIntelligent: false,
    tier: 'studio',
    category: 'japanese',
    tags: ['墨', '東洋', '伝統', 'モノクロ']
  },
  {
    id: 'pet-samurai',
    name: '武将スタイル',
    description: '鎧兜に身を包んだ勇ましい武将肖像画',
    thumbnailUrl: '/images/styles/pet/pet-samurai.jpeg',
    colorPalette: ['#2C2C2C', '#8B0000', '#C9B037', '#4A4A4A'],
    isIntelligent: false,
    tier: 'studio',
    category: 'narikiri',
    tags: ['武将', '鎧', '和風'],
    isNew: true,
    popularity: 88
  },
  // ポップ・イラスト
  {
    id: 'anime',
    name: 'アニメ',
    description: 'セル画風の鮮やかなアニメイラスト',
    thumbnailUrl: '/images/styles/pet/anime.jpeg',
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
    thumbnailUrl: '/images/styles/pet/ghibli.jpeg',
    colorPalette: ['#4CAF50', '#8BC34A', '#FF9800', '#87CEEB'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['ジブリ', '手描き', '温かみ', 'ファンタジー']
  },
  {
    id: 'pet-fairy',
    name: '妖精',
    description: '花と光に囲まれたメルヘン妖精イラスト',
    thumbnailUrl: '/images/styles/pet/pet-fairy.jpeg',
    colorPalette: ['#FFB6C1', '#E6E6FA', '#98FB98', '#FFD700'],
    isIntelligent: false,
    tier: 'starter',
    category: 'narikiri',
    tags: ['妖精', 'ファンタジー', 'メルヘン'],
    isNew: true,
    popularity: 90,
    availableCategories: ['family', 'kids']
  },
  {
    id: 'pop-art',
    name: 'ポップアート',
    description: 'ビビッドな色でインパクト大！ウォーホル風ポップアート',
    thumbnailUrl: '/images/styles/pet/pop-art.jpeg',
    colorPalette: ['#FF1493', '#FFD700', '#00CED1', '#FF4500'],
    isIntelligent: false,
    tier: 'starter',
    category: 'pop',
    tags: ['ポップ', 'カラフル', 'ウォーホル', 'モダン']
  },
  {
    id: 'hand-drawn',
    name: 'スケッチ',
    description: '鉛筆や木炭で描いたような温かみのあるスケッチ風',
    thumbnailUrl: '/images/styles/pet/hand-drawn.jpeg',
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
    name: 'ステンドグラス',
    description: '教会のステンドグラスのように、光が透ける美しい装飾画',
    thumbnailUrl: '/images/styles/pet/stained-glass.jpeg',
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
    name: '花飾りポスター',
    description: 'ミュシャのような花と優雅な曲線で彩るエレガントなポスター風',
    thumbnailUrl: '/images/styles/pet/art-nouveau.jpeg',
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
    name: 'ドット絵',
    description: 'なつかしのゲーム風！レトロかわいいドット絵肖像画',
    thumbnailUrl: '/images/styles/pet/pixel-art.jpeg',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    isIntelligent: false,
    tier: 'free',
    category: 'digital',
    tags: ['ピクセル', 'レトロ', 'ゲーム', 'ドット絵', '8bit'],
    isNew: true,
    popularity: 85
  },
  {
    id: 'vector',
    name: 'フラットイラスト',
    description: 'すっきりおしゃれなフラットデザインイラスト',
    thumbnailUrl: '/images/styles/pet/vector.jpeg',
    colorPalette: ['#6C5CE7', '#00CECE', '#FD79A8', '#FDCB6E'],
    isIntelligent: false,
    tier: 'starter',
    category: 'digital',
    tags: ['ベクター', 'フラット', 'グラフィック', 'ミニマル'],
    isNew: true,
    popularity: 75
  }
];
