import { Loader2, AlertTriangle } from 'lucide-react';
import { useTextOverlay } from '../../hooks/useTextOverlay';

export interface PortraitPreviewProps {
  /** ベース画像のdata URL */
  baseImageUrl: string;
  /** アートスタイルID */
  styleId: string;
  /** 名前（空欄の場合はオーバーレイなし） */
  portraitName: string;
  /** 画像のalt属性 */
  alt?: string;
  /** 追加のCSSクラス */
  className?: string;
}

export function PortraitPreview({
  baseImageUrl,
  styleId,
  portraitName,
  alt = '肖像画プレビュー',
  className = '',
}: PortraitPreviewProps) {
  const { overlayedImageUrl, isProcessing, error } = useTextOverlay({
    baseImageUrl,
    styleId,
    portraitName,
    imageWidth: 1024,
    imageHeight: 1024,
  });

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

      {/* 名前入力時のラベル */}
      {portraitName && portraitName.trim() !== '' && !isProcessing && !error && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
          名前入り: {portraitName}
        </div>
      )}
    </div>
  );
}
