import { Loader2, AlertTriangle } from 'lucide-react';
import { useTextOverlay } from '../../hooks/useTextOverlay';
import type { TextOverlaySettings } from '../../types/textOverlay';

export interface PortraitPreviewProps {
  /** ベース画像のdata URL */
  baseImageUrl: string;
  /** アートスタイルID */
  styleId: string;
  /** 名前（空欄の場合はオーバーレイなし） */
  portraitName: string;
  /** カスタマイズ設定 */
  overlaySettings?: TextOverlaySettings;
  /** 親で計算済みのオーバーレイ画像URL（指定時は内部のuseTextOverlayをスキップ） */
  precomputedImageUrl?: string;
  /** 親で計算中かどうか（precomputedImageUrl使用時） */
  precomputedIsProcessing?: boolean;
  /** 親で発生したエラー（precomputedImageUrl使用時） */
  precomputedError?: string | null;
  /** 画像のalt属性 */
  alt?: string;
  /** 追加のCSSクラス */
  className?: string;
}

export function PortraitPreview({
  baseImageUrl,
  styleId,
  portraitName,
  overlaySettings,
  precomputedImageUrl,
  precomputedIsProcessing,
  precomputedError,
  alt = '肖像画プレビュー',
  className = '',
}: PortraitPreviewProps) {
  // precomputedImageUrl が渡された場合は内部計算をスキップ（Canvas二重実行防止）
  const internal = useTextOverlay({
    baseImageUrl,
    styleId,
    portraitName,
    imageWidth: 1024,
    imageHeight: 1024,
    overlaySettings,
    skip: precomputedImageUrl !== undefined,
  });

  const overlayedImageUrl = precomputedImageUrl ?? internal.overlayedImageUrl;
  const isProcessing = precomputedIsProcessing ?? internal.isProcessing;
  const error = precomputedError ?? internal.error;

  return (
    <div className={`relative ${className}`}>
      {/* プレビュー画像 */}
      <img
        src={overlayedImageUrl}
        alt={alt}
        className="w-full h-auto rounded-lg shadow-lg"
      />

      {/* 処理中オーバーレイ */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">名前を追加中...</p>
          </div>
        </div>
      )}

      {/* エラーオーバーレイ */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-red-700 px-4 text-center">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
