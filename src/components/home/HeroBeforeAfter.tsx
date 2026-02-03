import { useState, useEffect, useCallback } from 'react';
import { Star, Sparkles, ImageIcon } from 'lucide-react';

// フォールバック用のプレースホルダー画像（グラデーション背景）
function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-card via-card/80 to-muted/20 flex flex-col items-center justify-center">
      <ImageIcon className="w-16 h-16 text-muted/40 mb-4" />
      <p className="text-muted/60 text-sm text-center px-4">{label}</p>
    </div>
  );
}

interface TransformationSample {
  id: string;
  beforeImage: string;
  afterImage: string;
  style: string;
  customerName: string;
}

// ローカル画像を使用（/public/images/hero/ に配置）
// 各サンプルのbefore/afterは同じ被写体の変換ペアである必要があります
const samples: TransformationSample[] = [
  {
    id: '1',
    beforeImage: '/images/hero/golden-before.jpg',
    afterImage: '/images/hero/golden-after.jpg',
    style: 'ルネサンス貴族',
    customerName: '田中様のゴールデン'
  },
  {
    id: '2',
    beforeImage: '/images/hero/cat-before.jpg',
    afterImage: '/images/hero/cat-after.jpg',
    style: '王宮肖像画',
    customerName: '佐藤様の猫'
  },
  {
    id: '3',
    beforeImage: '/images/hero/family-before.jpg',
    afterImage: '/images/hero/family-after.jpg',
    style: '印象派風',
    customerName: '山田様のご家族'
  }
];

export function HeroBeforeAfter() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealProgress, setRevealProgress] = useState(0);
  const [phase, setPhase] = useState<'revealing' | 'showing' | 'hiding'>('revealing');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const currentSample = samples[currentIndex];
  const hasBeforeError = imageErrors[`${currentSample.id}-before`];
  const hasAfterError = imageErrors[`${currentSample.id}-after`];

  const handleImageError = (sampleId: string, type: 'before' | 'after') => {
    setImageErrors(prev => ({ ...prev, [`${sampleId}-${type}`]: true }));
  };

  const nextSample = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % samples.length);
      setRevealProgress(0);
      setPhase('revealing');
      setIsTransitioning(false);
    }, 600);
  }, []);

  // Auto-animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === 'revealing') {
        setRevealProgress((prev) => {
          if (prev >= 100) {
            setPhase('showing');
            return 100;
          }
          return prev + 1.5;
        });
      } else if (phase === 'showing') {
        // Hold for a moment
        setTimeout(() => setPhase('hiding'), 2000);
      } else if (phase === 'hiding') {
        setRevealProgress((prev) => {
          if (prev <= 0) {
            nextSample();
            return 0;
          }
          return prev - 2;
        });
      }
    }, 30);

    return () => clearInterval(interval);
  }, [phase, nextSample]);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-card/30 to-background">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]" />

        {/* Animated floating shapes */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float-delayed" />

        {/* Japanese-inspired decorative lines */}
        <svg className="absolute top-10 right-10 w-32 h-32 text-secondary/20" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        <svg className="absolute bottom-10 left-10 w-24 h-24 text-primary/20" viewBox="0 0 100 100">
          <path d="M10 50 L50 10 L90 50 L50 90 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Before/After Showcase */}
          <div className={`relative transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {/* Main Image Container */}
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Decorative Frame */}
              <div className="absolute -inset-4 border border-secondary/30 rounded-3xl" />
              <div className="absolute -inset-8 border border-secondary/10 rounded-[2rem]" />

              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-br from-secondary/20 via-transparent to-primary/20 rounded-3xl blur-2xl opacity-50" />

              {/* Image Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                {/* Before Image (Background) */}
                {hasBeforeError ? (
                  <div className="absolute inset-0">
                    <ImagePlaceholder label="元の写真を配置してください" />
                  </div>
                ) : (
                  <img
                    src={currentSample.beforeImage}
                    alt="元の写真"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => handleImageError(currentSample.id, 'before')}
                  />
                )}

                {/* After Image (Revealed) */}
                <div
                  className="absolute inset-0 overflow-hidden transition-all duration-100 ease-out"
                  style={{
                    clipPath: `circle(${revealProgress * 1.5}% at 50% 50%)`
                  }}
                >
                  {hasAfterError ? (
                    <div className="w-full h-full">
                      <ImagePlaceholder label="変換後の画像を配置してください" />
                    </div>
                  ) : (
                    <img
                      src={currentSample.afterImage}
                      alt="肖像画"
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(currentSample.id, 'after')}
                    />
                  )}

                  {/* Golden shimmer overlay during reveal */}
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-secondary/30 via-transparent to-secondary/20 mix-blend-overlay"
                    style={{ opacity: revealProgress < 100 ? 0.6 : 0 }}
                  />
                </div>

                {/* Center reveal indicator */}
                {revealProgress < 100 && revealProgress > 0 && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: `${revealProgress * 3}%`,
                      height: `${revealProgress * 3}%`,
                      maxWidth: '80%',
                      maxHeight: '80%'
                    }}
                  >
                    <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                  </div>
                )}

                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/60 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/60 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/60 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/60 rounded-br-lg" />
              </div>

              {/* Labels */}
              <div className={`
                absolute top-6 left-6 px-4 py-2
                bg-foreground/80 backdrop-blur-md text-white
                text-sm font-medium rounded-full
                transition-all duration-500
                ${revealProgress > 20 ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}
              `}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  元の写真
                </span>
              </div>

              <div className={`
                absolute top-6 right-6 px-4 py-2
                bg-gradient-to-r from-secondary to-secondary/80 backdrop-blur-md text-white
                text-sm font-medium rounded-full shadow-lg
                transition-all duration-500
                ${revealProgress > 80 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
              `}>
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {currentSample.style}
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3">
                {samples.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setRevealProgress(0);
                      setPhase('revealing');
                    }}
                    className={`
                      transition-all duration-300 rounded-full
                      ${idx === currentIndex
                        ? 'w-8 h-2 bg-secondary shadow-lg shadow-secondary/50'
                        : 'w-2 h-2 bg-muted/40 hover:bg-muted/60'
                      }
                    `}
                    aria-label={`サンプル ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Copy & CTA */}
          <div className="text-center lg:text-left space-y-8">
            {/* Eyebrow */}
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-secondary text-sm tracking-[0.25em] uppercase font-medium">
                AI Portrait Art
              </span>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-secondary" />
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground leading-tight tracking-wide">
              <span className="block">1枚の写真が、</span>
              <span className="block mt-2">
                <span className="relative inline-block">
                  世界に一つ
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary/40" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0 6 Q25 0 50 6 Q75 12 100 6" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </span>
                のアートに
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-muted text-lg sm:text-xl leading-relaxed max-w-lg mx-auto lg:mx-0">
              AIが描く、あなただけの肖像画。
              <br className="hidden sm:block" />
              大切なペットや家族の写真を、美しい芸術作品に変えます。
            </p>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center lg:justify-start gap-6 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-secondary fill-secondary" />
                ))}
                <span className="ml-2 text-foreground font-semibold">4.9</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <span className="text-muted">
                <span className="text-primary font-semibold">1,247人</span>が体験
              </span>
            </div>


          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted/50 animate-bounce">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-muted/50 to-transparent" />
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 10s ease-in-out infinite;
          animation-delay: -4s;
        }
      `}</style>
    </section>
  );
}
