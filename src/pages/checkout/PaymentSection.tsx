import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  squareError: string | null;
  isReady: boolean;
  onRetry: () => void;
}

export function PaymentSection({ squareError, isReady, onRetry }: Props) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg text-foreground">お支払い方法</h2>
      </div>

      {squareError ? (
        <div>
          <p className="text-sale text-sm">{squareError}</p>
          <button type="button" onClick={onRetry} className="text-blue-600 hover:underline text-sm mt-2">
            再試行
          </button>
        </div>
      ) : !isReady ? (
        <div className="flex items-center gap-2 text-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>決済フォームを読み込み中...</span>
        </div>
      ) : null}

      <div id="card-container" className="min-h-[44px]" />

      <div className="flex items-center gap-2 mt-4 text-xs text-muted">
        <ShieldCheck className="w-4 h-4" />
        <span>カード情報はSquareが安全に処理します。当サイトではカード情報を保存しません。</span>
      </div>
    </section>
  );
}
