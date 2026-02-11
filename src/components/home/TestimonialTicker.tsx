import { useState, useEffect } from 'react';
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
    name: '田中様',
    initial: '田',
    rating: 5,
    comment: '愛犬の肖像画、想像以上の出来栄えでした！額に入れて玄関に飾っていますが、来客の方にも好評です。',
    style: '浮世絵風',
    category: 'pets',
    beforeImage: '/images/hero/dog-before.jpg',
    afterImage: '/images/hero/dog-after.jpeg',
  },
  {
    id: '2',
    name: '佐藤様',
    initial: '佐',
    rating: 5,
    comment: '家族写真を古典名画で仕上げてもらいました。祖母の誕生日に贈ったら涙を流して喜んでくれました。',
    style: '古典名画',
    category: 'family',
    beforeImage: '/images/hero/family-before.jpeg',
    afterImage: '/images/hero/family-after.jpeg',
  },
  {
    id: '3',
    name: '鈴木様',
    initial: '鈴',
    rating: 4,
    comment: '猫の肖像画がとても可愛くて、友人にも勧めました。プレビューで仕上がりを確認できるのが安心でした。',
    style: 'アニメ風',
    category: 'pets',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/hero/cat-after.jpeg',
  },
  {
    id: '4',
    name: '山田様',
    initial: '山',
    rating: 5,
    comment: '子供の七五三写真を水彩画風に。成長の記念として一生の宝物になりました。リビングに飾るたびに温かい気持ちになります。',
    style: '水彩画',
    category: 'kids',
    beforeImage: '/images/hero/kids-before.jpeg',
    afterImage: '/images/hero/kids-after.jpeg',
  },
  {
    id: '5',
    name: '高橋様',
    initial: '高',
    rating: 5,
    comment: '豪華油絵スタイルが本当に美術館の絵のよう。技術の高さに感動しました。部屋の雰囲気が一気に変わりました。',
    style: '豪華油絵',
    category: 'pets',
    beforeImage: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop&q=80',
    afterImage: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=300&h=300&fit=crop&q=80',
  },
  {
    id: '6',
    name: '伊藤様',
    initial: '伊',
    rating: 4,
    comment: '結婚記念日のサプライズに。夫婦の肖像画をやわらか絵画で仕上げてもらいました。妻がとても喜んでくれて大満足です。',
    style: 'やわらか絵画',
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

export function TestimonialTicker() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const items = prefersReducedMotion ? testimonials : [...testimonials, ...testimonials];

  return (
    <section className="py-12 overflow-hidden" aria-labelledby="testimonial-heading">
      <div className="mb-8 text-center">
        <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">
          お客様の声
        </p>
        <h3 id="testimonial-heading" className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
          2,800件以上のレビューで平均4.9の高評価
        </h3>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className={`flex gap-5 overflow-x-auto snap-x snap-mandatory sm:overflow-visible sm:snap-none ${prefersReducedMotion ? '' : 'sm:animate-tickerScroll'} scrollbar-hide`}>
          {items.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.id}-${index}`}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
