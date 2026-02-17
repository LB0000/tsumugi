import { useMemo, memo } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';
import { SOCIAL_PROOF_RATING, SOCIAL_PROOF_REVIEW_COUNT } from '../../data/socialProof';
import { categorySamples } from './hero/heroSamples';
import { ParallaxCard } from './hero/ParallaxCard';
import { BackgroundDecorations } from './hero/BackgroundDecorations';
import './hero/heroAnimations.css';

function HeroBeforeAfterBase() {
  const { selectedCategory } = useAppStore();
  const displayCategory = selectedCategory;

  const samples = useMemo(() => {
    return categorySamples[displayCategory] || categorySamples.pets;
  }, [displayCategory]);

  const currentCategory = useMemo(() => {
    return categories.find(c => c.id === displayCategory);
  }, [displayCategory]);

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative sm:min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-card/20 to-background">
      <BackgroundDecorations />

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-16 items-center">

          {/* Part A: ラベル + ヘッドライン */}
          <div
            key={`headline-${displayCategory}`}
            className="order-1 lg:col-start-2 lg:row-start-1 text-center lg:text-left space-y-3 hero-animate-fadeIn"
          >
            <div className="flex items-center justify-center lg:justify-start gap-3 hero-animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-secondary text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">
                Portrait Art
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-secondary" />
            </div>

            <h1 className="font-serif text-[1.6rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold text-foreground leading-[1.15] tracking-wide hero-animate-fadeIn" style={{ animationDelay: '0.5s' }}>
              <span className="block">{currentCategory?.headline.split('、')[0] || '1枚の写真が'}、</span>
              <span className="block mt-1 lg:mt-2 bg-gradient-to-r from-foreground via-foreground to-secondary bg-clip-text">
                {currentCategory?.headline.split('、')[1] || '世界に一つのアートに'}
              </span>
            </h1>
          </div>

          {/* パララックス画像エリア */}
          <div
            key={`visual-${displayCategory}`}
            className="relative h-[240px] sm:h-[400px] lg:h-[540px] overflow-hidden order-2 lg:col-start-1 lg:row-start-1 lg:row-end-3 hero-animate-fadeIn"
          >
            {samples.map((sample, index) => (
              <ParallaxCard key={`${displayCategory}-${sample.id}`} sample={sample} index={index} />
            ))}
          </div>

          {/* Part B: 説明 + バッジ + CTA + 評価 */}
          <div
            key={`cta-${displayCategory}`}
            className="order-3 lg:col-start-2 lg:row-start-2 text-center lg:text-left space-y-3 sm:space-y-5 lg:space-y-8 hero-animate-fadeIn"
          >
            <p className="text-muted text-sm sm:text-lg lg:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 hero-animate-fadeIn" style={{ animationDelay: '0.7s' }}>
              {currentCategory?.heroDescription}
            </p>

            {/* 無料プレビュー・登録不要バッジ */}
            <div className="flex items-center justify-center lg:justify-start gap-3 hero-animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-accent-sage/15 text-accent-sage text-xs sm:text-sm font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-accent-sage rounded-full" />
                無料プレビュー
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-secondary/10 text-secondary text-xs sm:text-sm font-medium rounded-full">
                登録不要
              </span>
            </div>

            {/* CTA ボタン */}
            <div id="hero-cta" className="flex flex-col items-center lg:items-start gap-3 hero-animate-fadeIn" style={{ animationDelay: '0.9s' }}>
              <button
                onClick={scrollToUpload}
                className="group relative px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-bold rounded-full bg-gradient-to-r from-secondary to-secondary/90 text-white shadow-2xl shadow-secondary/30 hover:shadow-secondary/50 hover:scale-[1.05] transition-all duration-300 flex items-center gap-3 cursor-pointer overflow-hidden animate-subtlePulse"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center gap-3">
                  無料でプレビューを見る
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </button>
              <span className="text-sm text-muted">
                ¥{(currentCategory?.basePrice || 2900).toLocaleString()}〜 · プレビューで仕上がりを確認できます
              </span>
            </div>

            {/* 信頼指標 */}
            <div className="hero-animate-fadeIn pt-1" style={{ animationDelay: '1.1s' }}>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-secondary fill-secondary" />
                  ))}
                  <span className="ml-1.5 text-foreground font-bold">{SOCIAL_PROOF_RATING}</span>
                  <span className="text-muted">({SOCIAL_PROOF_REVIEW_COUNT})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* スクロールインジケーター — デスクトップのみ */}
      <div className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-muted/40 animate-bounce">
        <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
        <div className="w-px h-6 bg-gradient-to-b from-muted/40 to-transparent" />
      </div>
    </section>
  );
}

export const HeroBeforeAfter = memo(HeroBeforeAfterBase);
