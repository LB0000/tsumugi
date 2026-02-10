import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  initial: string;
  rating: number;
  comment: string;
  style: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: '田中様',
    initial: '田',
    rating: 5,
    comment: '愛犬の肖像画、想像以上の出来栄えでした！額に入れて玄関に飾っています。',
    style: '浮世絵風'
  },
  {
    id: '2',
    name: '佐藤様',
    initial: '佐',
    rating: 5,
    comment: '家族写真をルネサンス風にしてもらいました。祖母へのプレゼントに最高でした。',
    style: 'ルネサンス'
  },
  {
    id: '3',
    name: '鈴木様',
    initial: '鈴',
    rating: 4,
    comment: '猫の肖像画がとても可愛くて、友人にも勧めました。注文も簡単でした。',
    style: 'アニメ風'
  },
  {
    id: '4',
    name: '山田様',
    initial: '山',
    rating: 5,
    comment: '子供の七五三写真を水彩画風に。一生の宝物になりました。',
    style: '水彩画'
  },
  {
    id: '5',
    name: '高橋様',
    initial: '高',
    rating: 5,
    comment: 'バロック風の肖像画が本当に美術館の絵のよう。AIの進化に驚きです。',
    style: 'バロック'
  },
  {
    id: '6',
    name: '伊藤様',
    initial: '伊',
    rating: 4,
    comment: '結婚記念日のサプライズに。夫婦の肖像画を印象派風にしてもらいました。',
    style: '印象派'
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-72 sm:w-80 p-5 glass-card rounded-2xl">
      {/* 顧客情報 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary">
          {testimonial.initial}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{testimonial.name}</p>
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
      <p className="text-sm text-muted leading-relaxed mb-3 line-clamp-3">
        「{testimonial.comment}」
      </p>

      {/* スタイルバッジ */}
      <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
        {testimonial.style}
      </span>
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

  // reduced-motionではスクロールしないので複製不要
  const items = prefersReducedMotion ? testimonials : [...testimonials, ...testimonials];

  return (
    <section className="py-12 overflow-hidden" aria-labelledby="testimonial-heading">
      <div className="mb-8 text-center">
        <p className="text-xs text-secondary uppercase tracking-[0.2em] mb-2">
          お客様の声
        </p>
        <h3 id="testimonial-heading" className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
          多くのお客様に喜ばれています
        </h3>
      </div>

      <div className="relative">
        {/* 左右フェードグラデーション */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* スクロールコンテナ */}
        <div className={`flex gap-5 ${prefersReducedMotion ? 'overflow-x-auto' : 'animate-tickerScroll'}`}>
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
