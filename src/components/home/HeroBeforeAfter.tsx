import { useMemo, useState, useEffect, memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';
import {
  SOCIAL_PROOF_GENERATION_COUNT,
  SOCIAL_PROOF_RATING_NUM,
  SOCIAL_PROOF_SATISFACTION_RATE,
} from '../../data/socialProof';
import { categorySamples } from './hero/heroSamples';
import { ParallaxCard } from './hero/ParallaxCard';
import { BackgroundDecorations } from './hero/BackgroundDecorations';
import './hero/heroAnimations.css';

const heroMetrics = [
  { value: SOCIAL_PROOF_GENERATION_COUNT, suffix: '+', label: '作品を生成', decimals: 0 },
  { value: SOCIAL_PROOF_RATING_NUM, suffix: '/5.0', label: '平均評価', decimals: 1 },
  { value: SOCIAL_PROOF_SATISFACTION_RATE, suffix: '%', label: '満足度', decimals: 0 },
];

function HeroAnimatedNumber({ target, suffix, decimals }: { target: number; suffix: string; decimals: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let rafId: number;
    const delay = setTimeout(() => {
      const duration = 2000;
      const startTime = performance.now();
      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCurrent(target * eased);
        if (progress < 1) rafId = requestAnimationFrame(animate);
      }
      rafId = requestAnimationFrame(animate);
    }, 1200); // Start after hero fade-in completes
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(rafId);
    };
  }, [target]);

  const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();
  return (
    <>
      <span className="text-gradient-gold">{formatted}</span>
      <span className="text-gradient-gold text-[0.55em] font-semibold opacity-60">{suffix}</span>
    </>
  );
}

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
    document.getElementById('category-section')?.scrollIntoView({ behavior: 'smooth' });
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
            <div className="flex items-center justify-center lg:justify-start gap-3 hero-animate-fadeIn-delay-1">
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-secondary text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">
                Portrait Art
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-secondary" />
            </div>

            <h1 className="font-serif text-[1.6rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold text-foreground leading-[1.15] tracking-wide hero-animate-fadeIn-delay-2">
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
            <p className="text-muted text-sm sm:text-lg lg:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 hero-animate-fadeIn-delay-3">
              {currentCategory?.heroDescription}
            </p>

            {/* CTA ボタン */}
            <div id="hero-cta" className="flex flex-col items-center lg:items-start gap-3 hero-animate-fadeIn-delay-4">
              <button
                onClick={scrollToUpload}
                className="group px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-semibold rounded-full bg-secondary text-white shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/30 hover:brightness-105 active:scale-[0.98] transition-all duration-500 ease-out flex items-center gap-3 cursor-pointer"
              >
                無料でプレビューを見る
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-500 ease-out" />
              </button>
            </div>

            {/* 実績メトリクス */}
            <div className="hero-animate-fadeIn-delay-5 pt-2">
              <div className="inline-flex items-stretch justify-center lg:justify-start rounded-2xl border border-secondary/15 bg-gradient-to-br from-card/80 via-card/60 to-secondary/[0.03] backdrop-blur-sm shadow-sm">
                {heroMetrics.map((metric, i) => (
                  <div key={metric.label} className="flex items-stretch">
                    <div className="text-center px-4 sm:px-6 py-3 sm:py-4" role="group" aria-label={`${metric.label}: ${metric.value}${metric.suffix}`}>
                      <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight leading-none mb-1" aria-hidden="true">
                        <HeroAnimatedNumber target={metric.value} suffix={metric.suffix} decimals={metric.decimals} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted tracking-[0.1em]" aria-hidden="true">
                        {metric.label}
                      </div>
                    </div>
                    {i < heroMetrics.length - 1 && (
                      <div className="flex items-center" aria-hidden="true">
                        <div className="w-px h-8 bg-gradient-to-b from-transparent via-secondary/25 to-transparent" />
                      </div>
                    )}
                  </div>
                ))}
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
