import type { PricingPlan, PrintSize, QuickAction } from '../types';

export const pricingPlans: PricingPlan[] = [
  {
    id: 'digital',
    name: 'デジタルパック',
    tagline: '無料プレビュー後のお試しに',
    price: 2900,
    priceExcludingTax: 2636,
    credits: 5,
    downloads: 2,
    styleCount: 1,
    hasWatermark: true,
    hasRetryTools: true,
    hasPrecisionEditor: 'none',
    features: [
      '5回の生成',
      'ダウンロード2点',
      'スタイル1種類',
      '透かし入り（プレビュー確認用）',
      'リトライツール付き',
      '商用利用権',
    ],
    pricePerCredit: 580,
    pointsEarned: 29,
    savingsNote: '単品購入と同じ単価',
  },
  {
    id: 'starter',
    name: 'スターターパック',
    tagline: 'はじめての方に一番人気',
    price: 4900,
    priceExcludingTax: 4454,
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
    pricePerCredit: 490,
    pointsEarned: 49,
    popularPercent: 68,
    savingsNote: '透かしなし・単品より15%お得',
  },
  {
    id: 'studio',
    name: 'スタジオパック',
    tagline: '本格派のための最高コスパ',
    price: 19900,
    priceExcludingTax: 18090,
    credits: 60,
    downloads: 'unlimited',
    styleCount: 'all',
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'advanced',
    features: [
      '60回の生成',
      '全作品ダウンロード',
      '全19スタイル',
      '無制限リトライ',
      '高度な精密エディター',
      '1作品あたり¥332',
    ],
    badge: 'best-value',
    pricePerCredit: 332,
    pointsEarned: 199,
    savingsNote: '単品より43%お得',
  }
];

export const printSizes: PrintSize[] = [
  { id: '8x10', dimensions: '8×10インチ（約20×25cm）', price: 8900 },
  { id: '12x16', dimensions: '12×16インチ（約30×40cm）', price: 11900 },
  { id: '18x24', dimensions: '18×24インチ（約45×60cm）', price: 19900 },
  { id: '24x36', dimensions: '24×36インチ（約60×90cm）', price: 29900 }
];

export const quickActions: QuickAction[] = [
  { id: 'download', label: 'ダウンロードを探す', icon: 'download' },
  { id: 'track', label: 'プリント配送状況', icon: 'truck' },
  { id: 'edit', label: '画像を編集', icon: 'edit' },
  { id: 'upscale', label: '4Kにアップスケール', icon: 'sparkles' },
  { id: 'payment', label: '支払いの問題', icon: 'credit-card' },
  { id: 'trial', label: 'トライアル制限', icon: 'refresh-cw' },
  { id: 'order', label: '注文ヘルプ', icon: 'help-circle' }
];
