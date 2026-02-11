import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Package, Mail, ExternalLink } from 'lucide-react';
import { StyledButton, Breadcrumb } from '../components/common';
import type { ShippingAddress } from '../types';

interface OrderState {
  orderId: string;
  paymentId: string;
  totalAmount: number;
  receiptUrl?: string;
  shippingAddress: ShippingAddress;
}

export function OrderConfirmationPage() {
  const location = useLocation();
  const state = location.state as OrderState | null;

  if (!state?.orderId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: '注文完了' }]} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-sage/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent-sage" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            ご注文ありがとうございます
          </h1>
          <p className="text-muted">
            注文が正常に完了しました。確認メールをお送りしました。
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          {/* Order Number */}
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted">注文番号</p>
              <p className="font-mono text-foreground">{state.orderId}</p>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-4 border-y border-border">
            <span className="font-semibold text-foreground">お支払い金額</span>
            <span className="text-xl font-bold text-primary">¥{state.totalAmount.toLocaleString()}</span>
          </div>

          {/* Shipping Address */}
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted mb-1">配送先</p>
              <p className="text-foreground">
                {state.shippingAddress.lastName} {state.shippingAddress.firstName}
              </p>
              <p className="text-sm text-muted">
                〒{state.shippingAddress.postalCode}<br />
                {state.shippingAddress.prefecture}{state.shippingAddress.city}<br />
                {state.shippingAddress.addressLine}
              </p>
              <p className="text-sm text-muted mt-1">{state.shippingAddress.email}</p>
            </div>
          </div>

          {/* Receipt Link */}
          {state.receiptUrl && (
            <a
              href={state.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              領収書を表示
            </a>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/">
            <StyledButton size="lg">
              トップページに戻る
            </StyledButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
