import { useState, useEffect, useCallback, useRef } from 'react';
import { applyTextOverlay } from '../lib/textOverlay';
import { waitForFontLoad } from '../lib/textOverlay';
import { getPortraitFont } from '../data/portraitFonts';

export interface UseTextOverlayOptions {
  /** ベース画像のdata URL */
  baseImageUrl: string;
  /** アートスタイルID */
  styleId: string;
  /** 名前（空欄の場合はオーバーレイなし） */
  portraitName: string;
  /** 画像の幅 */
  imageWidth?: number;
  /** 画像の高さ */
  imageHeight?: number;
}

export interface UseTextOverlayResult {
  /** テキストオーバーレイ適用済みの画像URL（名前が空欄の場合は baseImageUrl） */
  overlayedImageUrl: string;
  /** 処理中フラグ */
  isProcessing: boolean;
  /** エラー */
  error: string | null;
  /** 手動で再適用 */
  reapply: () => void;
}

/**
 * テキストオーバーレイ適用のカスタムフック
 *
 * パフォーマンス最適化:
 * - 入力のdebounce (500ms) でCanvas再描画を削減
 * - Generation counterでrace conditionを防止
 */
export function useTextOverlay(options: UseTextOverlayOptions): UseTextOverlayResult {
  const { baseImageUrl, styleId, portraitName, imageWidth = 1024, imageHeight = 1024 } = options;

  const [overlayedImageUrl, setOverlayedImageUrl] = useState<string>(baseImageUrl);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store latest values in refs to avoid recreating applyOverlay
  const latestValuesRef = useRef({ baseImageUrl, styleId, portraitName, imageWidth, imageHeight });
  latestValuesRef.current = { baseImageUrl, styleId, portraitName, imageWidth, imageHeight };

  // Race condition prevention: generation counter
  const generationRef = useRef(0);

  // Debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable applyOverlay function (reads from refs to avoid dependency churn)
  const applyOverlay = useCallback(async () => {
    const { baseImageUrl, styleId, portraitName, imageWidth, imageHeight } = latestValuesRef.current;

    // Increment generation counter
    generationRef.current += 1;
    const currentGeneration = generationRef.current;

    // 名前が空欄の場合は元の画像を使用
    if (!portraitName || portraitName.trim() === '') {
      setOverlayedImageUrl(baseImageUrl);
      setIsProcessing(false);
      setError(null);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // フォントを事前読み込み
      const fontConfig = getPortraitFont(styleId);
      await waitForFontLoad(fontConfig.fontFamily, 2000);

      // テキストオーバーレイを適用
      const newImageUrl = await applyTextOverlay(baseImageUrl, {
        text: portraitName,
        styleId,
        imageWidth,
        imageHeight,
      });

      // Only update if this is still the latest generation (race condition prevention)
      if (currentGeneration === generationRef.current) {
        setOverlayedImageUrl(newImageUrl);
      }
    } catch (err) {
      console.error('Text overlay failed:', err);
      // Only update error state if this is still the latest generation
      if (currentGeneration === generationRef.current) {
        setError('名前の表示に失敗しました。もう一度お試しください。');
        setOverlayedImageUrl(baseImageUrl);
      }
    } finally {
      // Only clear processing if this is still the latest generation
      if (currentGeneration === generationRef.current) {
        setIsProcessing(false);
      }
    }
  }, []); // Empty deps - stable function that reads from ref

  // Debounced auto-apply effect
  useEffect(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If name is empty, apply immediately (no debounce needed)
    if (!portraitName || portraitName.trim() === '') {
      applyOverlay();
      return;
    }

    // Debounce non-empty name changes (500ms)
    debounceTimerRef.current = setTimeout(() => {
      applyOverlay();
    }, 500);

    // Cleanup on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [baseImageUrl, styleId, portraitName, imageWidth, imageHeight, applyOverlay]);

  return {
    overlayedImageUrl,
    isProcessing,
    error,
    reapply: applyOverlay,
  };
}
