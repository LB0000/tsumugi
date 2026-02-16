import { useEffect, useRef } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Package, Mail, ExternalLink } from 'lucide-react';
import { StyledButton, Breadcrumb, ShareButtons } from '../components/common';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { GuestAccountPrompt } from './checkout/GuestAccountPrompt';
import { useAuthStore } from '../stores/authStore';
import { trackMetaPurchase } from '../lib/analytics';
import type { ShippingAddress } from '../types';

interface OrderState {
  orderId: string;
  paymentId: string;
  totalAmount: number;
  receiptUrl?: string;
  shippingAddress: ShippingAddress;
}

function getSafeReceiptUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function OrderConfirmationPage() {
  const location = useLocation();
  const { authUser } = useAuthStore();
  const state = location.state as OrderState | null;
  const safeReceiptUrl = getSafeReceiptUrl(state?.receiptUrl);
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    if (state?.orderId && state?.paymentId && !purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true;
      trackMetaPurchase({
        content_ids: [],
        content_type: 'product',
        value: state.totalAmount,
        currency: 'JPY',
      }, `purchase-${state.orderId}-${state.paymentId}`);
    }
  }, [state]);

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
          {safeReceiptUrl && (
            <a
              href={safeReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              領収書を表示
            </a>
          )}
        </div>

        {/* Review Form */}
        <div className="mt-8">
          <ReviewForm orderId={state.orderId} />
        </div>

        {/* Guest Account Prompt */}
        {!authUser && state.shippingAddress?.email && (
          <div className="mt-8">
            <GuestAccountPrompt
              email={state.shippingAddress.email}
              orderId={state.orderId}
            />
          </div>
        )}

        {/* Share section */}
        <div className="mt-10 text-center">
          <p className="text-muted text-sm mb-4">
            TSUMUGIの体験を友達にも教えてあげましょう
          </p>
          <ShareButtons
            url={window.location.origin}
            title="TSUMUGIでペットの肖像画を作りました！ #TSUMUGI"
            className="justify-center"
          />
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
