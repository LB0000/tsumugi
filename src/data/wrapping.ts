/**
 * ギフトラッピングの価格設定
 */
export const WRAPPING_PRICES: Record<string, number> = {
  premium: 500,
  noshi: 300,
} as const;

/**
 * ラッピングIDから価格を取得
 * @param wrappingId ラッピングID (null/undefined の場合は0)
 * @returns ラッピング価格（円）
 */
export function getWrappingPrice(wrappingId: string | null | undefined): number {
  if (!wrappingId) return 0;
  return WRAPPING_PRICES[wrappingId] ?? 0;
}
