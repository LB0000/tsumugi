import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Star } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getReviews, getReviewSummary } from '../../api/reviews';
import type { ReviewItem } from '../../api/reviews';

interface Testimonial {
  id: string;
  name: string;
  initial: string;
  rating: number;
  comment: string;
  category: 'pets' | 'family' | 'kids';
}

const categoryLabels: Record<string, string> = {
  pets: 'ペット',
  family: 'ファミリー',
  kids: 'キッズ',
};

const fallbackTestimonials: Testimonial[] = [
  {
    id: 'f1',
    name: 'S.T様',
    initial: 'S',
    rating: 5,
    comment: '愛犬の肖像画、想像以上の出来栄えでした！額に入れて玄関に飾っていますが、来客の方にも好評です。',
    category: 'pets',
  },
  {
    id: 'f2',
    name: 'M.S様',
    initial: 'M',
    rating: 5,
    comment: '家族写真をやわらか絵画で仕上げてもらいました。祖母の誕生日に贈ったら涙を流して喜んでくれました。',
    category: 'family',
  },
  {
    id: 'f3',
    name: 'A.S様',
    initial: 'A',
    rating: 4,
    comment: '猫の肖像画がとても可愛くて、友人にも勧めました。プレビューで仕上がりを確認できるのが安心でした。',
    category: 'pets',
  },
  {
    id: 'f4',
    name: 'Y.K様',
    initial: 'Y',
    rating: 5,
    comment: '子供の七五三写真を古典名画風に。成長の記念として一生の宝物になりました。リビングに飾るたびに温かい気持ちになります。',
    category: 'kids',
  },
  {
    id: 'f5',
    name: 'K.T様',
    initial: 'K',
    rating: 5,
    comment: '豪華油絵スタイルが本当に美術館の絵のよう。技術の高さに感動しました。部屋の雰囲気が一気に変わりました。',
    category: 'pets',
  },
  {
    id: 'f6',
    name: 'R.I様',
    initial: 'R',
    rating: 4,
    comment: '結婚記念日のサプライズに。家族の肖像画をジブリ風で仕上げてもらいました。妻がとても喜んでくれて大満足です。',
    category: 'family',
  },
];

function formatUserName(name: string): string {
  if (!name) return '?';
  const chars = name.split('');
  if (chars.length <= 2) return `${chars[0]}.**様`;
  return `${chars[0]}.${chars[1]}様`;
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function reviewToTestimonial(review: ReviewItem): Testimonial {
  return {
    id: review.id,
    name: formatUserName(review.userName),
    initial: getInitial(review.userName),
    rating: review.rating,
    comment: review.comment,
    category: review.category,
  };
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-[80vw] sm:w-80 snap-center glass-card rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 hover:-translate-y-0.5">
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
        <p className="text-sm text-muted leading-relaxed sm:line-clamp-3">
          「{testimonial.comment}」
        </p>
      </div>
    </div>
  );
}

function TestimonialTickerBase() {
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [summary, setSummary] = useState<{ averageRating: number; totalCount: number } | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    getReviews(selectedCategory, 20)
      .then((res) => {
        if (cancelled) return;
        if (res.reviews.length > 0) {
          setTestimonials(res.reviews.map(reviewToTestimonial));
        } else {
          setTestimonials(fallbackTestimonials.filter(
            (t) => t.category === selectedCategory
          ));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTestimonials(fallbackTestimonials);
        }
      });

    return () => { cancelled = true; };
  }, [selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    getReviewSummary()
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch(() => {
        // Use fallback heading when API fails
      });

    return () => { cancelled = true; };
  }, []);

  const handleScroll = useCallback(() => {
    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setShowHint(false);
    }
  }, []);

  const items = prefersReducedMotion ? testimonials : [...testimonials, ...testimonials];

  const headingCount = summary ? `${summary.totalCount.toLocaleString()}件のレビューで` : '2,800件以上のレビューで';
  const headingRating = summary ? `平均${summary.averageRating}の高評価` : '平均4.9の高評価';

  return (
    <section className="py-12" aria-labelledby="testimonial-heading">
      <div className="mb-8 text-center">
        <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">
          お客様の声
        </p>
        <h3 id="testimonial-heading" className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
          <span className="block sm:inline">{headingCount}</span>
          <span className="block sm:inline">{headingRating}</span>
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
