import { useState, useEffect, useCallback, useRef } from 'react';
import { applyTextOverlay } from '../lib/textOverlay';
import { waitForFontLoad } from '../lib/textOverlay';
import { getPortraitFont } from '../data/portraitFonts';
import { getSelectableFont } from '../data/selectableFonts';
import { getDecorationPreset } from '../data/decorationPresets';
import type { TextOverlaySettings } from '../types/textOverlay';

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
  /** カスタマイズ設定（省略時はスタイル推奨） */
  overlaySettings?: TextOverlaySettings;
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
 * TextOverlaySettings を TextOverlayOptions の customFont/customDecoration に変換
 */
function resolveOverlaySettings(settings?: TextOverlaySettings) {
  if (!settings) {
    return { customFont: undefined, customDecoration: undefined, position: undefined };
  }

  // フォント解決
  const customFont = settings.fontId
    ? (() => {
        const font = getSelectableFont(settings.fontId);
        return font ? { fontFamily: font.fontFamily, fontWeight: font.fontWeight } : undefined;
      })()
    : undefined;

  // 装飾解決
  const customDecoration = settings.decorationId
    ? (() => {
        const preset = getDecorationPreset(settings.decorationId);
        return preset ? {
          color: preset.color,
          shadow: preset.shadow,
          stroke: preset.stroke,
          glow: preset.glow,
        } : undefined;
      })()
    : undefined;

  return {
    customFont,
    customDecoration,
    position: settings.position,
  };
}

/**
 * テキストオーバーレイ適用のカスタムフック
 *
 * パフォーマンス最適化:
 * - テキスト入力のdebounce (500ms) でCanvas再描画を削減
 * - フォント/装飾/位置変更は即時適用（クリック操作のため）
 * - Generation counterでrace conditionを防止
 */
export function useTextOverlay(options: UseTextOverlayOptions): UseTextOverlayResult {
  const { baseImageUrl, styleId, portraitName, imageWidth = 1024, imageHeight = 1024, overlaySettings } = options;

  const [overlayedImageUrl, setOverlayedImageUrl] = useState<string>(baseImageUrl);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store latest values in refs to avoid recreating applyOverlay
  const latestValuesRef = useRef({
    baseImageUrl, styleId, portraitName, imageWidth, imageHeight, overlaySettings,
  });
  latestValuesRef.current = {
    baseImageUrl, styleId, portraitName, imageWidth, imageHeight, overlaySettings,
  };

  // Race condition prevention: generation counter
  const generationRef = useRef(0);

  // Debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous portraitName to distinguish name changes from settings changes
  const prevNameRef = useRef(portraitName);

  // Stable applyOverlay function (reads from refs to avoid dependency churn)
  const applyOverlay = useCallback(async () => {
    const { baseImageUrl, styleId, portraitName, imageWidth, imageHeight, overlaySettings } = latestValuesRef.current;

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
      // 設定を解決
      const { customFont, customDecoration, position } = resolveOverlaySettings(overlaySettings);

      // フォントを事前読み込み（カスタムフォント優先）
      const fontFamily = customFont?.fontFamily ?? getPortraitFont(styleId).fontFamily;
      await waitForFontLoad(fontFamily, 2000);

      // テキストオーバーレイを適用
      const newImageUrl = await applyTextOverlay(baseImageUrl, {
        text: portraitName,
        styleId,
        imageWidth,
        imageHeight,
        customFont,
        customDecoration,
        position,
      });

      // Only update if this is still the latest generation (race condition prevention)
      if (currentGeneration === generationRef.current) {
        setOverlayedImageUrl(newImageUrl);
      }
    } catch (err) {
      console.error('Text overlay failed:', err);
      if (currentGeneration === generationRef.current) {
        setError('名前の表示に失敗しました。もう一度お試しください。');
        setOverlayedImageUrl(baseImageUrl);
      }
    } finally {
      if (currentGeneration === generationRef.current) {
        setIsProcessing(false);
      }
    }
  }, []); // Empty deps - stable function that reads from ref

  // Auto-apply effect: debounce text input only, apply settings changes immediately
  useEffect(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const nameChanged = prevNameRef.current !== portraitName;
    prevNameRef.current = portraitName;

    // If name is empty, apply immediately (no debounce needed)
    if (!portraitName || portraitName.trim() === '') {
      applyOverlay();
      return;
    }

    if (nameChanged) {
      // Text input changes: debounce 500ms to reduce Canvas redraws
      debounceTimerRef.current = setTimeout(() => {
        applyOverlay();
      }, 500);
    } else {
      // Font/decoration/position changes: apply immediately (click operations)
      applyOverlay();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    baseImageUrl, styleId, portraitName, imageWidth, imageHeight,
    overlaySettings?.fontId, overlaySettings?.decorationId, overlaySettings?.position,
    applyOverlay,
  ]);

  return {
    overlayedImageUrl,
    isProcessing,
    error,
    reapply: applyOverlay,
  };
}
