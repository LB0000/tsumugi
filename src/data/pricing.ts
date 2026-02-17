/**
 * 価格定義（シンプル版）
 */

export const PRICING = {
  // 無料お試し
  FREE_CREDITS: 3,

  // 1回あたりの価格
  PRICE_PER_GENERATION: 98,

  // チャージパック（1つだけ）
  CHARGE_PACK: {
    credits: 10,
    price: 980,
    pricePerCredit: 98,
  },
} as const;

// ヘルパー関数
export const calculateChargeCost = (credits: number): number => {
  return credits * PRICING.PRICE_PER_GENERATION;
};
