import { Router } from 'express';

export const stylesRouter = Router();

const artStyles = [
  {
    id: 'intelligent',
    name: 'おまかせAI',
    description: 'AIがあなたの写真に最適なスタイルを自動選択',
    thumbnailUrl: '',
    colorPalette: [],
    isIntelligent: true,
    tier: 'free'
  },
  {
    id: 'baroque',
    name: '豪華油絵',
    description: '赤ベルベットと金の額縁で彩る、まるで王様みたいな豪華肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: 'pet-royalty',
    name: 'うちの子 王族',
    description: '王冠とマントをまとった、うちの子の威厳あふれるロイヤル肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#722F37', '#DAA520', '#4B0082', '#FFFACD'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'renaissance',
    name: '古典名画',
    description: 'ダヴィンチが描いたような、格調高い古典名画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'impressionist',
    name: 'やわらか絵画',
    description: 'モネやルノワールのような、光あふれるやわらかタッチの絵画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#87CEEB', '#F0E68C', '#DDA0DD', '#98FB98'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'watercolor',
    name: '水彩画',
    description: '繊細な筆遣いと淡い色彩による和風水彩画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545486332-9e0999c535b2?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#E8F4F8', '#B8D4E3', '#7FB3D5', '#2E86AB'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'ukiyo-e',
    name: '浮世絵',
    description: '北斎や広重のような伝統的な木版画スタイル',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513569771920-c9e1d31714af?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#1A3A5C', '#C9B037', '#E8D5B7', '#8B4513'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'sumi-e',
    name: '水墨画',
    description: '墨の濃淡で描く東洋の伝統画法',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C2C2C', '#696969', '#A9A9A9', '#F5F5F5'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'pet-samurai',
    name: '武将',
    description: '鎧兜に身を包んだ勇ましい武将肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C2C2C', '#8B0000', '#C9B037', '#4A4A4A'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'anime',
    name: 'アニメ',
    description: 'セル画風の鮮やかなアニメイラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF6B9D', '#C44569', '#F8B500', '#00D9FF'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: 'ghibli',
    name: 'ジブリ風',
    description: '温かみのある手描き風アニメーション',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#4CAF50', '#8BC34A', '#FF9800', '#87CEEB'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'pet-fairy',
    name: '妖精',
    description: '花と光に囲まれたメルヘン妖精イラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FFB6C1', '#E6E6FA', '#98FB98', '#FFD700'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'pop-art',
    name: 'ポップアート',
    description: 'ビビッドな色でインパクト大！ウォーホル風ポップアート',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF1493', '#FFD700', '#00CED1', '#FF4500'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'hand-drawn',
    name: 'スケッチ',
    description: '鉛筆や木炭で描いたような温かみのあるスケッチ風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C3E50', '#7F8C8D', '#BDC3C7', '#ECF0F1'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'stained-glass',
    name: 'ステンドグラス',
    description: '教会のステンドグラスのように、光が透ける美しい装飾画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#E74C3C', '#3498DB', '#F39C12', '#2ECC71'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'art-nouveau',
    name: '花飾りポスター',
    description: 'ミュシャのような花と優雅な曲線で彩るエレガントなポスター風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#C9A96E', '#8B6914', '#5D4E37', '#E8D5B7'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'pixel-art',
    name: 'ドット絵',
    description: 'なつかしのゲーム風！レトロかわいいドット絵肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: '3d-illustration',
    name: 'ぷっくり3D',
    description: 'ピクサーみたいな、ぷっくりかわいい3Dキャラクター風',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'vector',
    name: 'フラットイラスト',
    description: 'すっきりおしゃれなフラットデザインイラスト',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#6C5CE7', '#00CECE', '#FD79A8', '#FDCB6E'],
    isIntelligent: false,
    tier: 'starter'
  }
];

stylesRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    styles: artStyles,
    total: artStyles.length
  });
});

stylesRouter.get('/:id', (req, res) => {
  const style = artStyles.find(s => s.id === req.params.id);

  if (!style) {
    res.status(404).json({
      success: false,
      error: { code: 'STYLE_NOT_FOUND', message: 'Style not found' }
    });
    return;
  }

  res.json({ success: true, style });
});
