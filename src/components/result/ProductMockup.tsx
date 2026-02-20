import { useMockupPreview } from '../../hooks/useMockupPreview';
import { hasMockupConfig } from '../../lib/mockupComposite';

interface ProductMockupProps {
  generatedImageUrl: string | null;
  productId: string;
  className?: string;
}

/**
 * 商品モックアッププレビュー
 *
 * 生成された肖像画をモックアップテンプレートに合成して表示する。
 * モックアップ設定がない商品（digital download 等）では何も描画しない。
 */
export function ProductMockup({
  generatedImageUrl,
  productId,
  className = '',
}: ProductMockupProps) {
  const { mockupUrl, isLoading, error } = useMockupPreview(generatedImageUrl, productId);

  if (!hasMockupConfig(productId)) return null;

  return (
    <div className={`overflow-hidden rounded-xl bg-[#666] ${className}`}>
      {isLoading ? (
        <div className="aspect-square animate-pulse bg-card-hover" />
      ) : error ? (
        <div className="aspect-square flex items-center justify-center text-xs text-muted p-4 text-center">
          プレビューを読み込めませんでした
        </div>
      ) : mockupUrl ? (
        <img
          src={mockupUrl}
          alt="商品イメージ"
          className="w-full aspect-square object-contain"
        />
      ) : null}
    </div>
  );
}
