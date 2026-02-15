import { Router } from 'express';

export const pricingRouter = Router();

const pricingPlans = [
  {
    id: 'digital',
    name: 'Digital Pack',
    price: 29,
    credits: 5,
    downloads: 2,
    styleCount: 1,
    hasWatermark: true,
    hasRetryTools: true,
    hasPrecisionEditor: 'none',
    features: [
      '5 Masterpieces to perfect your masterpiece',
      'Download 2 High-Resolution Portraits',
      'Fable masterpiece style',
      'Retry Tools: Masculine, Feminine, Describe Edit (3 = 1 credit)',
      'Lifetime access to your project',
      'Commercial use rights',
      'Instant access'
    ],
    badge: 'popular',
    pricePerCredit: 5.80
  },
  {
    id: 'starter',
    name: 'Starter Pack',
    price: 49,
    credits: 10,
    downloads: 10,
    styleCount: 6,
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'simple',
    features: [
      '10 Masterpieces to explore styles',
      'Download 10 High-Resolution Portraits',
      '6 curated art styles',
      'Retry Tools: Masculine, Feminine, Describe Edit (3 = 1 credit)',
      'Precision Editor – Simple Mode (3 edits = 1 credit)',
      'Lifetime access',
      'Commercial use rights',
      'Instant download'
    ],
    pricePerCredit: 4.90
  },
  {
    id: 'studio',
    name: 'Studio Pack',
    price: 199,
    credits: 60,
    downloads: 'unlimited',
    styleCount: 'all',
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'advanced',
    features: [
      '60 Masterpieces for unlimited creativity',
      'Download All 60 High-Resolution Masterpieces',
      'All 19 art styles',
      'Unlimited Retries',
      'Advanced Precision Editor (unlimited)',
      'Best value at $3.32 per masterpiece',
      'Commercial use rights'
    ],
    badge: 'best-value',
    pricePerCredit: 3.32
  }
];

const printSizes = [
  { id: '8x10', dimensions: '8×10"', price: 89 },
  { id: '12x16', dimensions: '12×16"', price: 119 },
  { id: '18x24', dimensions: '18×24"', price: 199 },
  { id: '24x36', dimensions: '24×36"', price: 299 }
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

