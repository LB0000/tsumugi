import type { PricingPlan, PrintSize, QuickAction } from '../types';

export const pricingPlans: PricingPlan[] = [
  {
    id: 'digital',
    name: 'デジタルパック',
    price: 2900,
    priceExcludingTax: 2636,
    credits: 5,
    downloads: 2,
    styleCount: 1,
    hasWatermark: true,
    hasRetryTools: true,
    hasPrecisionEditor: 'none',
    features: [
      '5回の作品生成で傑作を完成',
      '高解像度ポートレート2点をダウンロード',
      'マスターピーススタイル1種類',
      'リトライツール付き',
      'プロジェクトへの永久アクセス',
      '商用利用権',
      '即時アクセス'
    ],
    badge: 'popular',
    pricePerCredit: 580,
    pointsEarned: 29
  },
  {
    id: 'starter',
    name: 'スターターパック',
    price: 4900,
    priceExcludingTax: 4454,
    credits: 10,
    downloads: 10,
    styleCount: 6,
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'simple',
    features: [
      '10回の作品生成でスタイルを探索',
      '高解像度ポートレート10点をダウンロード',
      '厳選された6つのアートスタイル',
      'リトライツール付き',
      '精密エディター（シンプルモード）',
      '永久アクセス',
      '商用利用権',
      '即時ダウンロード'
    ],
    pricePerCredit: 490,
    pointsEarned: 49
  },
  {
    id: 'studio',
    name: 'スタジオパック',
    price: 19900,
    priceExcludingTax: 18090,
    credits: 60,
    downloads: 'unlimited',
    styleCount: 'all',
    hasWatermark: false,
    hasRetryTools: true,
    hasPrecisionEditor: 'advanced',
    features: [
      '60回の作品生成で無限の創造性',
      '60点すべての高解像度作品をダウンロード',
      '全19種類のアートスタイル',
      '無制限リトライ',
      '高度な精密エディター（無制限）',
      '1作品あたり¥332の最高コスパ',
      '商用利用権'
    ],
    badge: 'best-value',
    pricePerCredit: 332,
    pointsEarned: 199
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
