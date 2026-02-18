/**
 * クレジット管理の型定義
 * バックエンド GET /api/credits のレスポンスに合わせた型
 */

export interface UserCredits {
  freeRemaining: number;      // 残り無料回数（0-3）
  paidRemaining: number;      // 残り有料クレジット数
  totalRemaining: number;     // 合計残り（free + paid）
  totalUsed: number;          // 累計使用数
}

/**
 * 生成可否の判定
 */
export const canGenerateCredits = (credits: UserCredits): boolean => {
  return credits.totalRemaining > 0;
};

/**
 * 生成コスト種別
 */
export const getGenerationCostType = (
  credits: UserCredits
): 'free' | 'paid' => {
  return credits.freeRemaining > 0 ? 'free' : 'paid';
};

/**
 * 残高不足判定
 */
export const needsCharge = (credits: UserCredits): boolean => {
  return credits.totalRemaining === 0;
};
