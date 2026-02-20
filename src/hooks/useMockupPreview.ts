import { useState, useEffect, useRef } from 'react';
import { compositeOnMockup, hasMockupConfig } from '../lib/mockupComposite';

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
 */
export function useMockupPreview(
  generatedImageUrl: string | null,
  productId: string,
): UseMockupPreviewResult {
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 競合防止用カウンタ
  const generationRef = useRef(0);

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

    compositeOnMockup(generatedImageUrl, productId)
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
  }, [generatedImageUrl, productId]);

  return { mockupUrl, isLoading, error };
}
