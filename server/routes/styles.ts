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
    name: 'バロック',
    description: '赤ベルベットと金の額縁で彩る豪華な王室肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: 'renaissance',
    name: 'ルネサンス',
    description: 'ダヴィンチやラファエロのような洗練された古典肖像画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1706108775438-32ce1ddfb863?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'impressionist',
    name: '印象派',
    description: 'モネやルノワールのような柔らかな光と色彩の絵画',
    thumbnailUrl: 'https://images.unsplash.com/photo-1681838862526-e9b3cdd47a42?w=400&h=500&fit=crop&q=80',
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1626976234326-e48831f7f3e7?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#1A3A5C', '#C9B037', '#E8D5B7', '#8B4513'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'sumi-e',
    name: '水墨画',
    description: '墨の濃淡で描く東洋の伝統画法',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620069492288-26e45e925b8c?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#2C2C2C', '#696969', '#A9A9A9', '#F5F5F5'],
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
    thumbnailUrl: 'https://images.unsplash.com/photo-1707225801659-d70b9fa73e7a?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#4CAF50', '#8BC34A', '#FF9800', '#87CEEB'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'pop-art',
    name: 'ポップアート',
    description: 'ウォーホル風のカラフルでインパクトのあるアート',
    thumbnailUrl: 'https://images.unsplash.com/photo-1696596967919-aaf5e9834f85?w=400&h=500&fit=crop&q=80',
    colorPalette: ['#FF1493', '#FFD700', '#00CED1', '#FF4500'],
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
