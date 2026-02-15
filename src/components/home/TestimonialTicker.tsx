import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Star, ArrowRight } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  initial: string;
  rating: number;
  comment: string;
  style: string;
  category: 'pets' | 'family' | 'kids';
  beforeImage: string;
  afterImage: string;
}

const categoryLabels: Record<string, string> = {
  pets: 'ペット',
  family: 'ファミリー',
  kids: 'キッズ',
};

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'S.T様',
    initial: 'S',
    rating: 5,
    comment: '愛犬の肖像画、想像以上の出来栄えでした！額に入れて玄関に飾っていますが、来客の方にも好評です。',
    style: '古典名画',
    category: 'pets',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/hero/dog-after.jpeg',
  },
  {
    id: '2',
    name: 'M.S様',
    initial: 'M',
    rating: 5,
    comment: '家族写真をやわらか絵画で仕上げてもらいました。祖母の誕生日に贈ったら涙を流して喜んでくれました。',
    style: 'やわらか絵画',
    category: 'family',
    beforeImage: '/images/hero/family-before.jpeg',
    afterImage: '/images/hero/family-after.jpeg',
  },
  {
    id: '3',
    name: 'A.S様',
    initial: 'A',
    rating: 4,
    comment: '猫の肖像画がとても可愛くて、友人にも勧めました。プレビューで仕上がりを確認できるのが安心でした。',
    style: 'アニメ',
    category: 'pets',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/hero/cat-after.jpeg',
  },
  {
    id: '4',
    name: 'Y.K様',
    initial: 'Y',
    rating: 5,
    comment: '子供の七五三写真を古典名画風に。成長の記念として一生の宝物になりました。リビングに飾るたびに温かい気持ちになります。',
    style: '古典名画',
    category: 'kids',
    beforeImage: '/images/hero/kids-before.jpeg',
    afterImage: '/images/hero/kids-after.jpeg',
  },
  {
    id: '5',
    name: 'K.T様',
    initial: 'K',
    rating: 5,
    comment: '豪華油絵スタイルが本当に美術館の絵のよう。技術の高さに感動しました。部屋の雰囲気が一気に変わりました。',
    style: '豪華油絵',
    category: 'pets',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/styles/pet/baroque.jpeg',
  },
  {
    id: '6',
    name: 'R.I様',
    initial: 'R',
    rating: 4,
    comment: '結婚記念日のサプライズに。家族の肖像画をジブリ風で仕上げてもらいました。妻がとても喜んでくれて大満足です。',
    style: 'ジブリ風',
    category: 'family',
    beforeImage: '/images/hero/family2-before.jpeg',
    afterImage: '/images/hero/family2-after.jpeg',
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-[80vw] sm:w-80 snap-center glass-card rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 hover:-translate-y-0.5">
      {/* ビフォーアフター サムネイル */}
      <div className="flex items-center gap-0 h-36 sm:h-32 bg-gradient-to-r from-card to-card/80">
        <div className="flex-1 h-full overflow-hidden">
          <img
            src={testimonial.beforeImage}
            alt="Before"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/90 flex items-center justify-center z-10 -mx-4 shadow-md">
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 h-full overflow-hidden">
          <img
            src={testimonial.afterImage}
            alt="After"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* 顧客情報 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary">
            {testimonial.initial}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">{testimonial.name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/10 text-muted font-medium">
                {categoryLabels[testimonial.category]}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < testimonial.rating ? 'text-secondary fill-secondary' : 'text-muted/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* コメント */}
        <p className="text-sm text-muted leading-relaxed mb-3 sm:line-clamp-3">
          「{testimonial.comment}」
        </p>

        {/* スタイルバッジ */}
        <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          {testimonial.style}
        </span>
      </div>
    </div>
  );
}

function TestimonialTickerBase() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => (typeof window !== 'undefined')
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const [showHint, setShowHint] = useState(true);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleScroll = useCallback(() => {
    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setShowHint(false);
    }
  }, []);

  const items = prefersReducedMotion ? testimonials : [...testimonials, ...testimonials];

  return (
    <section className="py-12" aria-labelledby="testimonial-heading">
      <div className="mb-8 text-center">
        <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">
          お客様の声
        </p>
        <h3 id="testimonial-heading" className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
          <span className="block sm:inline">2,800件以上のレビューで</span>
          <span className="block sm:inline">平均4.9の高評価</span>
        </h3>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div
          onScroll={handleScroll}
          className={`flex gap-5 overflow-x-auto snap-x snap-mandatory sm:overflow-visible sm:snap-none ${prefersReducedMotion ? '' : 'animate-tickerScroll'} scrollbar-hide`}
        >
          {items.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.id}-${index}`}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>

      <p
        className="sm:hidden text-center text-xs text-muted mt-3 transition-opacity duration-500"
        style={{ opacity: showHint ? 1 : 0 }}
      >
        ← スワイプで表示 →
      </p>
    </section>
  );
}

export const TestimonialTicker = memo(TestimonialTickerBase);
