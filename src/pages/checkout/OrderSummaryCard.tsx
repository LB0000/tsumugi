import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StyledButton } from '../../components/common';
import type { CartItem } from '../../types';

interface Props {
  cartItems: CartItem[];
  subtotal: number;
  shipping: number;
  wrappingPrice: number;
  total: number;
  error: string | null;
  isProcessing: boolean;
  cardAttached: boolean;
}

export function OrderSummaryCard({
  cartItems,
  subtotal,
  shipping,
  wrappingPrice,
  total,
  error,
  isProcessing,
  cardAttached,
}: Props) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
      <h3 className="font-semibold text-foreground mb-4">注文内容</h3>

      <div className="space-y-3 mb-4 pb-4 border-b border-border">
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted">
              {item.name} ×{item.quantity}
            </span>
            <span className="text-foreground">¥{(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-4 pb-4 border-b border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted">小計</span>
          <span className="text-foreground">¥{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">送料</span>
          <span className="text-foreground">
            {shipping === 0 ? (
              <span className="text-accent-sage">無料</span>
            ) : (
              `¥${shipping.toLocaleString()}`
            )}
          </span>
        </div>
        {wrappingPrice > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">ギフトラッピング</span>
            <span className="text-foreground">¥{wrappingPrice.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between mb-6">
        <span className="font-semibold text-foreground">合計（税込）</span>
        <span className="text-xl font-bold text-primary">¥{total.toLocaleString()}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-sale/10 border border-sale/20 rounded-lg text-sm text-sale">
          {error}
        </div>
      )}

      <StyledButton
        type="submit"
        className="w-full mb-4"
        size="lg"
        disabled={isProcessing || !cardAttached}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            処理中...
          </>
        ) : (
          `¥${total.toLocaleString()} を支払う`
        )}
      </StyledButton>

      <Link to="/cart" className="flex items-center justify-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" />
        カートに戻る
      </Link>
    </div>
  );
}
