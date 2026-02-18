import { useState, useEffect, useCallback } from 'react';

/**
 * スクロール位置に基づいて FAB（Floating Action Button）の表示を制御するフック
 *
 * @param threshold - FAB を表示するスクロール位置（px）。デフォルトは200px
 * @returns showFab - FAB を表示すべきかどうかのフラグ
 *
 * 使用例:
 * ```tsx
 * function MyPage() {
 *   const showFab = useScrollFab(300); // 300px スクロール後に表示
 *   return (
 *     <>
 *       {showFab && <FloatingButton />}
 *     </>
 *   );
 * }
 * ```
 */
export function useScrollFab(threshold: number = 200): boolean {
  const [showFab, setShowFab] = useState(false);

  const handleScroll = useCallback(() => {
    setShowFab(window.scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return showFab;
}
