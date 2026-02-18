import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { trackEvent, trackMetaAddToCart } from '../lib/analytics';
import { DISCOUNT_RATE } from '../data/constants';
import type { TextOverlaySettings } from '../types/textOverlay';

export interface UseAddToCartOptions {
  /** 選択されたスタイルID */
  styleId: string;
  /** 選択されたスタイル名 */
  styleName: string;
  /** オーバーレイ適用済みの画像URL */
  overlayedImageUrl: string;
  /** 肖像画に表示する名前 */
  portraitName: string;
  /** テキストオーバーレイ設定 */
  textOverlaySettings: TextOverlaySettings;
  /** 24時間以内かどうか */
  isWithin24Hours: boolean;
}

export interface ProductToAdd {
  id: string;
  name: string;
  price: number;
}

export interface UseAddToCartResult {
  /** カートに追加済みの商品ID */
  addedProductId: string | null;
  /** 商品をカートに追加 */
  addProductToCart: (product: ProductToAdd) => void;
}

/**
 * 商品をカートに追加するカスタムフック
 *
 * 機能:
 * - 価格計算（24時間割引適用）
 * - トラッキングイベント送信
 * - カートへの追加
 * - カートページへのナビゲーション
 */
export function useAddToCart(options: UseAddToCartOptions): UseAddToCartResult {
  const {
    styleId,
    styleName,
    overlayedImageUrl,
    portraitName,
    textOverlaySettings,
    isWithin24Hours,
  } = options;

  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const addProductToCart = useCallback(
    (product: ProductToAdd) => {
      // 二重追加防止
      if (addedProductId) return;

      // 価格計算
      const finalPrice = isWithin24Hours
        ? Math.floor(product.price * (1 - DISCOUNT_RATE))
        : product.price;
      const discount = isWithin24Hours ? product.price * DISCOUNT_RATE : 0;

      // トラッキング
      trackEvent('add_to_cart', {
        productId: product.id,
        price: finalPrice,
        discount,
      });
      trackMetaAddToCart({
        content_ids: [product.id],
        content_type: 'product',
        value: finalPrice,
        currency: 'JPY',
      });

      // カートに追加
      addToCart({
        productId: product.id,
        name: product.name,
        artStyleId: styleId,
        artStyleName: styleName,
        imageUrl: overlayedImageUrl,
        quantity: 1,
        price: finalPrice,
        options: portraitName ? { portraitName, textOverlaySettings } : undefined,
      });

      // 追加済みフラグを設定してカートページへ
      setAddedProductId(product.id);
      setTimeout(() => navigate('/cart'), 800);
    },
    [
      addedProductId,
      isWithin24Hours,
      styleId,
      styleName,
      overlayedImageUrl,
      portraitName,
      textOverlaySettings,
      addToCart,
      navigate,
    ]
  );

  return {
    addedProductId,
    addProductToCart,
  };
}
