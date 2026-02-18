import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

/**
 * ResultPage のページガードフック
 *
 * 機能:
 * - Zustand persist の rehydration を待機
 * - generatedImage と selectedStyle が存在しない場合はホームにリダイレクト
 * - 直接URLアクセスやページリロード時の不正な状態を防ぐ
 *
 * 使用例:
 * ```tsx
 * function ResultPage() {
 *   useResultPageGuard();
 *   // ... rest of component
 * }
 * ```
 */
export function useResultPageGuard(): void {
  const navigate = useNavigate();
  const mountCheckRef = useRef(false);

  useEffect(() => {
    // マウント後の最初のチェックのみ実行（二重実行防止）
    if (mountCheckRef.current) return;

    const check = () => {
      mountCheckRef.current = true;
      const { generatedImage, selectedStyle } = useAppStore.getState();

      // 必須データが欠けている場合はホームへリダイレクト
      if (!generatedImage || !selectedStyle) {
        navigate('/');
      }
    };

    // Zustand persist の rehydration 完了を待つ
    if (useAppStore.persist.hasHydrated()) {
      check();
    } else {
      const unsubscribe = useAppStore.persist.onFinishHydration(() => {
        check();
        unsubscribe();
      });
    }
  }, [navigate]);
}
