import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { useMockupPreview } from '../../hooks/useMockupPreview';
import { hasMockupConfig } from '../../lib/mockupComposite';

interface CartItemImageProps {
  imageUrl: string;
  productId: string;
  alt: string;
}

/**
 * カートアイテムのサムネイル画像
 *
 * 物理商品（モックアップ設定あり）はモックアップ合成画像を表示。
 * それ以外は元の画像をそのまま表示する。
 */
export function CartItemImage({ imageUrl, productId, alt }: CartItemImageProps) {
  const { mockupUrl, isLoading, error } = useMockupPreview(
    hasMockupConfig(productId) ? imageUrl : null,
    productId,
  );
  const [imgError, setImgError] = useState(false);

  const displayUrl = (error ? null : mockupUrl) || imageUrl;

  return (
    <div className="w-24 h-24 rounded-lg bg-card overflow-hidden flex-shrink-0">
      {isLoading ? (
        <div className="w-full h-full animate-pulse bg-card-hover" />
      ) : imgError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-card-hover">
          <ImageIcon className="w-8 h-8 text-muted/40" />
        </div>
      ) : (
        <img
          src={displayUrl}
          alt={alt}
          className={`w-full h-full rounded-lg ${mockupUrl && !error ? 'object-contain bg-[#666]' : 'object-cover'}`}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
