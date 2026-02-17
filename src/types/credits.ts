/**
 * クレジット管理の型定義
 */

export interface UserCredits {
  // 無料枠
  freeUsed: number;           // 使用済み無料回数（0-3）
  freeRemaining: number;      // 残り無料回数（計算値: 3 - freeUsed）

  // 有料クレジット
  paidBalance: number;        // 残高（残りクレジット数）
  paidTotalPurchased: number; // 累計購入数
  paidTotalUsed: number;      // 累計使用数

  // メタ情報
  totalGenerated: number;     // 総生成回数
  lastChargeAt?: Date;        // 最終チャージ日時
}

/**
 * 生成可否の判定
 */
export const canGenerate = (credits: UserCredits): boolean => {
  return credits.freeRemaining > 0 || credits.paidBalance > 0;
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
  return credits.freeRemaining === 0 && credits.paidBalance === 0;
};
