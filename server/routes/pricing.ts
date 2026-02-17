import { Router } from 'express';

export const pricingRouter = Router();

const pricingPlans = [
  {
    id: 'digital',
    name: 'ライトパック',
    tagline: '無料プレビュー後のお試しに',
    price: 3900,
    priceExcludingTax: 3545,
    credits: 5,
    downloads: 5,
    styleCount: 1,
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'none',
    features: [
      '5回の生成',
      'ダウンロード5点',
      'スタイル1種類',
      '透かしなし',
      'リトライツール付き',
      '商用利用権',
    ],
    pricePerCredit: 780,
    pointsEarned: 39,
    savingsNote: '手軽に始められる',
  },
  {
    id: 'starter',
    name: 'スタンダードパック',
    tagline: 'はじめての方に一番人気',
    price: 5900,
    priceExcludingTax: 5363,
    credits: 10,
    downloads: 10,
    styleCount: 6,
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'simple',
    features: [
      '10回の生成',
      'ダウンロード10点',
      '厳選6スタイル',
      '透かしなし',
      '精密エディター付き',
      '商用利用権',
    ],
    badge: 'popular',
    pricePerCredit: 590,
    pointsEarned: 59,
    popularPercent: 68,
    savingsNote: '透かしなし・バランス重視',
  },
  {
    id: 'studio',
    name: 'プロパック',
    tagline: '本格派のための最高コスパ',
    price: 16900,
    priceExcludingTax: 15363,
    credits: 40,
    downloads: 'unlimited',
    styleCount: 'all',
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'advanced',
    features: [
      '40回の生成',
      '全作品ダウンロード',
      '全19スタイル',
      '無制限リトライ',
      '高度な精密エディター',
      '1作品あたり¥423',
    ],
    badge: 'best-value',
    pricePerCredit: 423,
    pointsEarned: 169,
    savingsNote: '大量生成に最適',
  }
];

const printSizes = [
  { id: '8x10', dimensions: '8×10インチ（約20×25cm）', price: 8900 },
  { id: '12x16', dimensions: '12×16インチ（約30×40cm）', price: 11900 },
  { id: '18x24', dimensions: '18×24インチ（約45×60cm）', price: 19900 },
  { id: '24x36', dimensions: '24×36インチ（約60×90cm）', price: 29900 }
];

pricingRouter.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    success: true,
    plans: pricingPlans,
    printSizes
  });
});

pricingRouter.get('/plans/:id', (req, res) => {
  const plan = pricingPlans.find(p => p.id === req.params.id);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: { code: 'PLAN_NOT_FOUND', message: 'Pricing plan not found' }
    });
    return;
  }

  res.json({ success: true, plan });
});

