import { Shield, RefreshCw, Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { pricingPlans, printSizes } from '../data/pricingPlans';
import { PricingCard } from '../components/pricing';

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors pr-4">
          {q}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-sm text-muted leading-relaxed pb-4 pr-8">
          {a}
        </p>
      )}
    </div>
  );
}

export function PricingPage() {
  return (
    <div className="flex-1 bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {/* 装飾ライン */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-secondary" />
            <div className="w-2 h-2 rotate-45 border border-secondary" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-secondary" />
          </div>

          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-foreground mb-4 tracking-wide">
            あなたの一枚に、最適なプランを
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            すべてのプランに永久アクセスと商用利用権が含まれています。<br className="hidden md:block" />
            プレビューは無料。納得してから購入できます。
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent-sage" />
              全額返金保証
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-accent-sage" />
              無料プレビュー
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent-sage" />
              クレジット無期限
            </span>
          </div>

          {/* 装飾ライン */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Credit Packs — Main section */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-secondary" />
              <span className="text-xs text-secondary tracking-[0.3em] font-medium">PLANS</span>
              <span className="w-8 h-px bg-secondary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              クレジットパック
            </h2>
            <p className="text-muted text-sm">
              まとめ買いほどお得。ポイント還元で次回もお得に
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-start">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>

          {/* Comparison hint */}
          <p className="text-center text-xs text-muted mt-6">
            ※ すべてのプランでプレビューは無料です。購入前に仕上がりを確認できます。
          </p>
        </section>

        {/* Pay Per Portrait — simplified */}
        <section className="mb-20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary tracking-[0.3em] font-medium">SINGLE PURCHASE</span>
              <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              単品購入
            </h2>
            <p className="text-muted text-sm">
              1枚だけ試したい方に
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🐾</span>
                <h3 className="font-serif font-semibold text-foreground">ペット肖像画</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground">¥2,900</span>
                <span className="text-xs text-muted">（税込）</span>
              </div>
              <p className="text-xs text-muted">ペット1匹 · 高解像度ダウンロード</p>
            </div>
            <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <h3 className="font-serif font-semibold text-foreground">ファミリー肖像画</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground">¥4,900</span>
                <span className="text-xs text-muted">（税込）</span>
              </div>
              <p className="text-xs text-muted">複数の人物＆ペット · 高解像度ダウンロード</p>
            </div>
          </div>

          {/* Upsell nudge */}
          <div className="mt-6 text-center">
            <p className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full text-xs text-primary">
              💡 スターターパックなら同じ価格で10回生成＋6スタイルが使えます
            </p>
          </div>
        </section>

        {/* Art Print Pricing */}
        <section className="bg-card/50 rounded-3xl p-8 md:p-12 mb-20">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary tracking-[0.3em] font-medium">ART PRINTS</span>
              <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              アートプリント
            </h2>
            <p className="text-muted text-sm">
              美術館品質のプリント。5,000円以上で送料無料
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {printSizes.map((size, index) => (
              <div
                key={size.id}
                className={`group p-6 rounded-2xl bg-background border-2 text-center transition-all duration-300 hover:shadow-lg ${
                  index === 2 ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border hover:border-primary/30'
                }`}
              >
                {index === 2 && (
                  <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full mb-2">
                    人気サイズ
                  </span>
                )}
                <p className="text-sm font-medium text-foreground mb-2">
                  {size.dimensions}
                </p>
                <p className="text-2xl font-bold text-primary mb-1">
                  ¥{size.price.toLocaleString()}
                </p>
                <p className="text-xs text-muted">（税込）</p>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee + FAQ */}
        <section className="max-w-3xl mx-auto mb-16">
          {/* Guarantee */}
          <div className="text-center mb-12 p-8 rounded-2xl bg-gradient-to-br from-accent-sage/5 to-accent-sage/10 border border-accent-sage/20">
            <Shield className="w-8 h-8 text-accent-sage mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              安心の全額返金保証
            </h3>
            <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
              仕上がりにご満足いただけない場合は、購入後30日以内であれば全額返金いたします。
              まずは無料プレビューで仕上がりをお確かめください。
            </p>
          </div>

          {/* FAQ */}
          <div className="text-center mb-8">
            <h3 className="font-serif text-xl font-semibold text-foreground">
              よくあるご質問
            </h3>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <FAQItem
              q="クレジットに有効期限はありますか？"
              a="いいえ、購入いただいたクレジットに有効期限はありません。いつでもお好きなタイミングでご利用いただけます。"
            />
            <FAQItem
              q="無料プレビューとは何ですか？"
              a="写真をアップロードすると、購入前に仕上がりイメージを無料でご確認いただけます。納得いただけてから購入・ダウンロードとなります。"
            />
            <FAQItem
              q="スタイルの変更はできますか？"
              a="はい、クレジットを使って何度でも異なるスタイルをお試しいただけます。パックのスタイル数は同時に利用できるスタイルの種類数を表します。"
            />
            <FAQItem
              q="商用利用は可能ですか？"
              a="はい、すべてのプランで商用利用権が付属しています。SNSへの投稿、グッズ制作、販促物への使用など、自由にご活用いただけます。"
            />
            <FAQItem
              q="返金は本当にできますか？"
              a="はい、購入後30日以内であれば理由を問わず全額返金いたします。お問い合わせフォームからご連絡ください。"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
