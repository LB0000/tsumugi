import { useState, useEffect, useMemo } from 'react';
import { Star, Sparkles, ImageIcon, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';

// フォールバック用のプレースホルダー画像
function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-card via-card/80 to-muted/20 flex flex-col items-center justify-center">
      <ImageIcon className="w-12 h-12 text-muted/40 mb-2" />
      <p className="text-muted/60 text-xs text-center px-2">{label}</p>
    </div>
  );
}

interface TransformationSample {
  id: string;
  beforeImage: string;
  afterImage: string;
  style: string;
  customerName: string;
  size: 'large' | 'medium';
  position: { x: string; y: string };
  mobilePosition: { x: string; y: string };
  revealDelay: number;
  rotation: number;
}

// カテゴリ別サンプルデータ
const categorySamples: Record<string, TransformationSample[]> = {
  pets: [
    {
      id: 'dog',
      beforeImage: '/images/hero/dog-before.jpg',
      afterImage: '/images/hero/dog-after.jpeg',
      style: '浮世絵風',
      customerName: '田中様の愛犬',
      size: 'large',
      position: { x: '8%', y: '8%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3
    },
    {
      id: 'cat',
      beforeImage: '/images/hero/cat-before.jpg',
      afterImage: '/images/hero/cat-after.jpeg',
      style: 'アニメ・イラスト風',
      customerName: '佐藤様の猫',
      size: 'medium',
      position: { x: '48%', y: '42%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4
    }
  ],
  family: [
    {
      id: 'family1',
      beforeImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&h=600&fit=crop&q=80',
      afterImage: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=500&h=600&fit=crop&q=80',
      style: 'ダヴィンチ風クラシック',
      customerName: '山田家の肖像',
      size: 'large',
      position: { x: '8%', y: '8%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3
    },
    {
      id: 'family2',
      beforeImage: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=500&h=600&fit=crop&q=80',
      afterImage: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500&h=600&fit=crop&q=80',
      style: '王室の豪華肖像画',
      customerName: '鈴木家の思い出',
      size: 'medium',
      position: { x: '48%', y: '42%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4
    }
  ],
  kids: [
    {
      id: 'kid1',
      beforeImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&h=600&fit=crop&q=80',
      afterImage: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=500&h=600&fit=crop&q=80',
      style: 'ロココ',
      customerName: 'ゆいちゃんの肖像',
      size: 'large',
      position: { x: '8%', y: '8%' },
      mobilePosition: { x: '5%', y: '5%' },
      revealDelay: 0,
      rotation: -3
    },
    {
      id: 'kid2',
      beforeImage: 'https://images.unsplash.com/photo-1595967964979-0a0a3f6f8dbd?w=500&h=600&fit=crop&q=80',
      afterImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&h=600&fit=crop&q=80',
      style: 'アニメ・イラスト風',
      customerName: 'けんたくんの冒険',
      size: 'medium',
      position: { x: '48%', y: '42%' },
      mobilePosition: { x: '44%', y: '25%' },
      revealDelay: 1200,
      rotation: 4
    }
  ]
};

// 個別のカードコンポーネント
function ParallaxCard({ sample, index }: { sample: TransformationSample; index: number }) {
  const [showAfter, setShowAfter] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // モバイル検出
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasBeforeError = imageErrors[`${sample.id}-before`];
  const hasAfterError = imageErrors[`${sample.id}-after`];

  const handleImageError = (type: 'before' | 'after') => {
    setImageErrors(prev => ({ ...prev, [`${sample.id}-${type}`]: true }));
  };

  // エントリーアニメーション
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 300);
    return () => clearTimeout(timer);
  }, [index]);

  // Before/After 切り替え（CSS transition で描画）
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setShowAfter(true);
      const interval = setInterval(() => {
        setShowAfter(prev => !prev);
      }, 3500);
      return () => clearInterval(interval);
    }, sample.revealDelay + 800);
    return () => clearTimeout(startTimer);
  }, [sample.revealDelay]);

  const sizeClasses = sample.size === 'large'
    ? 'w-40 h-40 sm:w-72 sm:h-72 lg:w-80 lg:h-80'
    : 'w-40 h-40 sm:w-64 sm:h-64 lg:w-72 lg:h-72';

  const zIndex = sample.size === 'large' ? 'z-20' : 'z-10';

  return (
    <div
      className={`absolute ${sizeClasses} ${zIndex} transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        left: isMobile ? sample.mobilePosition.x : sample.position.x,
        top: isMobile ? sample.mobilePosition.y : sample.position.y,
        transform: `rotate(${sample.rotation}deg)`,
      }}
    >
      {/* メイン画像コンテナ */}
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        {/* Before Image */}
        {hasBeforeError ? (
          <div className="absolute inset-0">
            <ImagePlaceholder label="Before" />
          </div>
        ) : (
          <img
            src={sample.beforeImage}
            alt={`${sample.customerName} - 元の写真`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => handleImageError('before')}
          />
        )}

        {/* After Image (水平ワイプ) */}
        <div
          className="absolute inset-0 transition-[clip-path] duration-[1.2s] ease-in-out"
          style={{
            clipPath: showAfter ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)'
          }}
        >
          {hasAfterError ? (
            <div className="w-full h-full">
              <ImagePlaceholder label="After" />
            </div>
          ) : (
            <img
              src={sample.afterImage}
              alt={`${sample.customerName} - ${sample.style}`}
              className="w-full h-full object-cover"
              onError={() => handleImageError('after')}
            />
          )}
        </div>

        {/* スタイルラベル */}
        <div className={`
          absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2
          bg-gradient-to-r from-secondary via-secondary to-secondary/90
          text-white text-xs font-semibold rounded-full shadow-xl whitespace-nowrap
          transition-all duration-500 backdrop-blur-sm
          ${showAfter ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}
        `}>
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            {sample.style}
          </span>
        </div>
      </div>
    </div>
  );
}

// 装飾パーティクル
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-secondary/40 rounded-full animate-float-particle"
          style={{
            left: `${10 + (i * 7)}%`,
            top: `${15 + (i % 4) * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 3)}s`
          }}
        />
      ))}
    </div>
  );
}

export function HeroBeforeAfter() {
  const { selectedCategory } = useAppStore();
  const displayCategory = selectedCategory;

  // 現在のカテゴリに対応するサンプルを取得
  const samples = useMemo(() => {
    return categorySamples[displayCategory] || categorySamples.pets;
  }, [displayCategory]);

  // 現在のカテゴリデータを取得
  const currentCategory = useMemo(() => {
    return categories.find(c => c.id === displayCategory);
  }, [displayCategory]);

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative sm:min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-card/20 to-background">
      {/* 背景装飾 - 強化版 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* メイングラデーション */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vw] h-[180vh] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12)_0%,transparent_60%)]" />

        {/* サブグラデーション */}
        <div className="absolute top-0 right-0 w-[100vw] h-[100vh] bg-[radial-gradient(ellipse_at_top_right,rgba(139,69,19,0.08)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-[80vw] h-[80vh] bg-[radial-gradient(ellipse_at_bottom_left,rgba(212,175,55,0.06)_0%,transparent_50%)]" />

        {/* 浮遊するぼかし円 - 強化 */}
        <div className="absolute top-16 left-[5%] w-80 h-80 rounded-full bg-secondary/8 blur-[100px] animate-float" />
        <div className="absolute bottom-16 right-[5%] w-[30rem] h-[30rem] rounded-full bg-primary/6 blur-[120px] animate-float-delayed" />
        <div className="hidden sm:block absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-secondary/5 blur-[80px] animate-float-slow" />

        {/* 装飾線 — デスクトップのみ */}
        <svg className="hidden sm:block absolute top-16 right-[8%] w-40 h-40 text-secondary/15" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 6" className="animate-spin-slow" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 4" />
        </svg>

        <svg className="hidden sm:block absolute bottom-20 left-[8%] w-32 h-32 text-primary/15" viewBox="0 0 100 100">
          <path d="M10 50 L50 10 L90 50 L50 90 Z" fill="none" stroke="currentColor" strokeWidth="0.4" className="animate-pulse-slow" />
          <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="none" stroke="currentColor" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="0.3" />
        </svg>

        {/* 追加装飾 — デスクトップのみ */}
        <div className="hidden sm:block absolute top-1/2 left-[15%] w-px h-32 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="hidden sm:block absolute top-1/4 right-[20%] w-px h-24 bg-gradient-to-b from-transparent via-secondary/15 to-transparent" />

        <FloatingParticles />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-16 items-center">

          {/* Part A: ラベル + ヘッドライン — モバイルで最初に表示 */}
          <div
            key={`headline-${displayCategory}`}
            className="order-1 lg:col-start-2 lg:row-start-1 text-center lg:text-left space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-center lg:justify-start gap-3 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-secondary text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">
                Portrait Art
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-secondary" />
            </div>

            <h1 className="font-serif text-[1.6rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold text-foreground leading-[1.15] tracking-wide animate-fadeIn" style={{ animationDelay: '0.5s' }}>
              <span className="block">{currentCategory?.headline.split('、')[0] || '1枚の写真が'}、</span>
              <span className="block mt-1 lg:mt-2 bg-gradient-to-r from-foreground via-foreground to-secondary bg-clip-text">
                {currentCategory?.headline.split('、')[1] || '世界に一つのアートに'}
              </span>
            </h1>
          </div>

          {/* パララックス画像エリア — モバイルではヘッドライン直後 */}
          <div
            key={`visual-${displayCategory}`}
            className="relative h-[240px] sm:h-[400px] lg:h-[540px] overflow-hidden order-2 lg:col-start-1 lg:row-start-1 lg:row-end-3 animate-fadeIn"
          >
            {samples.map((sample, index) => (
              <ParallaxCard key={`${displayCategory}-${sample.id}`} sample={sample} index={index} />
            ))}
          </div>

          {/* Part B: 説明 + バッジ + CTA + 評価 — モバイルでは画像の後 */}
          <div
            key={`cta-${displayCategory}`}
            className="order-3 lg:col-start-2 lg:row-start-2 text-center lg:text-left space-y-3 sm:space-y-5 lg:space-y-8 animate-fadeIn"
          >
            <p className="text-muted text-sm sm:text-lg lg:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
              {currentCategory?.heroDescription}
            </p>

            {/* 無料プレビュー・登録不要バッジ */}
            <div className="flex items-center justify-center lg:justify-start gap-3 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-accent-sage/15 text-accent-sage text-xs sm:text-sm font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-accent-sage rounded-full" />
                無料プレビュー
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-secondary/10 text-secondary text-xs sm:text-sm font-medium rounded-full">
                登録不要
              </span>
            </div>

            {/* CTA ボタン */}
            <div id="hero-cta" className="flex flex-col items-center lg:items-start gap-3 animate-fadeIn" style={{ animationDelay: '0.9s' }}>
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
            <div className="animate-fadeIn pt-1" style={{ animationDelay: '1.1s' }}>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-secondary fill-secondary" />
                  ))}
                  <span className="ml-1.5 text-foreground font-bold">4.9</span>
                  <span className="text-muted">(2,847件)</span>
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

      {/* カスタムアニメーション */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-15px) translateX(8px); opacity: 0.6; }
          50% { transform: translateY(-25px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-10px) translateX(12px); opacity: 0.5; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 10s ease-in-out infinite;
          animation-delay: -4s;
        }
        .animate-float-slow {
          animation: float 12s ease-in-out infinite;
          animation-delay: -2s;
        }
        .animate-float-particle {
          animation: float-particle 5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
