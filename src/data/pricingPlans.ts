import type { PricingPlan, PrintSize, QuickAction } from '../types';

/**
 * @deprecated 旧価格プラン - 新しいシンプルなチャージ方式に移行しました
 * 新しい価格定義は src/data/pricing.ts を参照してください
 *
 * 無料3回お試し → ¥980/10回チャージ のシンプルな構成
 */
export const pricingPlans: PricingPlan[] = [
  // 旧プラン定義は非推奨
  // 新しいシステムでは使用しません
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
