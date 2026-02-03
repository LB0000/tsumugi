import { pricingPlans, printSizes } from '../data/pricingPlans';
import { PricingCard } from '../components/pricing';

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
            料金プラン
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            あなたの傑作に最適なプランをお選びください。<br className="hidden md:block" />
            すべてのプランに永久アクセスと商用利用権が含まれています。
          </p>

          {/* 装飾ライン */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Pay Per Portrait */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary tracking-[0.3em] font-medium">SINGLE PURCHASE</span>
              <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              単品購入
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="group p-8 rounded-2xl bg-card border-2 border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <span className="text-2xl">🐾</span>
              </div>
              <h3 className="font-serif font-semibold text-foreground text-xl mb-3">ペット肖像画</h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-primary">¥2,900</span>
                <span className="text-sm text-muted">（税込）</span>
              </div>
              <p className="text-xs text-muted mb-4">税抜価格: ¥2,636</p>
              <p className="text-sm text-muted leading-relaxed">ペット1匹、高解像度ダウンロード</p>
            </div>
            <div className="group p-8 rounded-2xl bg-card border-2 border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="font-serif font-semibold text-foreground text-xl mb-3">ファミリー肖像画</h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-primary">¥4,900</span>
                <span className="text-sm text-muted">（税込）</span>
              </div>
              <p className="text-xs text-muted mb-4">税抜価格: ¥4,454</p>
              <p className="text-sm text-muted leading-relaxed">複数の人物＆ペット、高解像度ダウンロード</p>
            </div>
          </div>
        </section>

        {/* Credit Packs */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-secondary" />
              <span className="text-xs text-secondary tracking-[0.3em] font-medium">CREDIT PACKS</span>
              <span className="w-8 h-px bg-secondary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              クレジットパック
            </h2>
            <p className="text-muted">
              まとめ買いでお得に！ポイント還元あり
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        {/* Art Print Pricing */}
        <section className="bg-card/50 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary tracking-[0.3em] font-medium">ART PRINTS</span>
              <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">
              アートプリント価格
            </h2>
            <p className="text-muted">
              美術館品質のプリント、5,000円以上で送料無料
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
      </div>
    </div>
  );
}
