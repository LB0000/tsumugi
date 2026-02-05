import { Router } from 'express';

export const stylesRouter = Router();

const artStyles = [
  {
    id: 'intelligent',
    name: 'Intelligent',
    description: 'Let AI choose the perfect style based on your photos',
    thumbnailUrl: '',
    colorPalette: [],
    isIntelligent: true,
    tier: 'free'
  },
  {
    id: 'baroque-red',
    name: 'Baroque Red',
    description: 'Classic royal portrait with rich velvet drapes and golden baroque frames',
    thumbnailUrl: '/images/styles/baroque-red.jpg',
    colorPalette: ['#8B0000', '#DAA520', '#2F1810', '#F5DEB3'],
    isIntelligent: false,
    tier: 'free'
  },
  {
    id: 'florentine-renaissance',
    name: 'Florentine Renaissance',
    description: 'Timeless elegance with refined brushwork and classical composition',
    thumbnailUrl: '/images/styles/florentine.jpg',
    colorPalette: ['#8B4513', '#D2691E', '#2F2F2F', '#F5F5DC'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'renaissance-sky',
    name: 'Renaissance Sky',
    description: 'Atmospheric Renaissance style with dramatic lighting and old master technique',
    thumbnailUrl: '/images/styles/renaissance-sky.jpg',
    colorPalette: ['#4682B4', '#87CEEB', '#2F4F4F', '#F0E68C'],
    isIntelligent: false,
    tier: 'starter'
  },
  {
    id: 'dutch-golden',
    name: 'Dutch Golden Age',
    description: 'Rich chiaroscuro lighting inspired by Rembrandt and Vermeer',
    thumbnailUrl: '/images/styles/dutch-golden.jpg',
    colorPalette: ['#3D2314', '#8B7355', '#DAA520', '#1C1C1C'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'venetian',
    name: 'Venetian',
    description: 'Warm, luminous colors and sensuous brushwork of the Venetian masters',
    thumbnailUrl: '/images/styles/venetian.jpg',
    colorPalette: ['#C41E3A', '#FFD700', '#006994', '#8B4513'],
    isIntelligent: false,
    tier: 'studio'
  },
  {
    id: 'neoclassical',
    name: 'Neoclassical',
    description: 'Elegant simplicity and idealized beauty inspired by ancient Greece and Rome',
    thumbnailUrl: '/images/styles/neoclassical.jpg',
    colorPalette: ['#F5F5DC', '#708090', '#CD853F', '#2F4F4F'],
    isIntelligent: false,
    tier: 'studio'
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
