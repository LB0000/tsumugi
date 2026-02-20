import { useState, useEffect, useRef } from 'react';
import { compositeOnMockup, hasMockupConfig } from '../lib/mockupComposite';
import type { CompositeOptions } from '../lib/mockupComposite';

/** プレビュー表示用のデフォルト最大辺サイズ (px) */
const DEFAULT_PREVIEW_MAX_SIZE = 1024;

interface UseMockupPreviewResult {
  mockupUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * 生成画像をモックアップに合成して返す React hook
 *
 * - 商品にモックアップ設定がなければ即座に null を返す
 * - 依存値（generatedImageUrl, productId）が変わった時のみ再合成
 * - maxSize 省略時は表示用に 1024px に縮小（フルサイズが必要なら明示的に指定）
 */
export function useMockupPreview(
  generatedImageUrl: string | null,
  productId: string,
  options?: CompositeOptions,
): UseMockupPreviewResult {
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 競合防止用カウンタ
  const generationRef = useRef(0);

  // オブジェクト参照ではなくプリミティブを依存値に使う
  const maxSize = options?.maxSize ?? DEFAULT_PREVIEW_MAX_SIZE;

  useEffect(() => {
    if (!generatedImageUrl || !hasMockupConfig(productId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when input becomes invalid
      setMockupUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentGen = ++generationRef.current;
    let cancelled = false;
    setMockupUrl(null); // Release previous data URL reference for GC
    setIsLoading(true);
    setError(null);

    compositeOnMockup(generatedImageUrl, productId, { maxSize })
      .then((result) => {
        if (cancelled || generationRef.current !== currentGen) return;
        setMockupUrl(result);
      })
      .catch((err) => {
        if (cancelled || generationRef.current !== currentGen) return;
        console.error('Mockup composite failed:', err);
        setError('モックアップの生成に失敗しました');
        setMockupUrl(null);
      })
      .finally(() => {
        if (cancelled || generationRef.current !== currentGen) return;
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [generatedImageUrl, productId, maxSize]);

  return { mockupUrl, isLoading, error };
}
