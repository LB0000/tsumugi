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
      mobilePosition: { x: '30%', y: '45%' },
      revealDelay: 1200,
      rotation: 4
    }
  ],
  family: [
    {
      id: 'family1',
      beforeImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&h=600&fit=crop&q=80',
      afterImage: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=500&h=600&fit=crop&q=80',
      style: 'ルネサンス',
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
      style: 'バロック',
      customerName: '鈴木家の思い出',
      size: 'medium',
      position: { x: '48%', y: '42%' },
      mobilePosition: { x: '30%', y: '45%' },
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
      mobilePosition: { x: '30%', y: '45%' },
      revealDelay: 1200,
      rotation: 4
    }
  ]
};

// 個別のカードコンポーネント
function ParallaxCard({ sample, index }: { sample: TransformationSample; index: number }) {
  const [revealProgress, setRevealProgress] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'revealing' | 'showing' | 'hiding'>('waiting');
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

  // 遅延開始のためのエフェクト
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('revealing');
    }, sample.revealDelay + 800);
    return () => clearTimeout(timer);
  }, [sample.revealDelay]);

  // アニメーションエフェクト
  useEffect(() => {
    if (phase === 'waiting') return;

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
        setTimeout(() => setPhase('hiding'), 2000);
      } else if (phase === 'hiding') {
        setRevealProgress((prev) => {
          if (prev <= 15) {
            setPhase('revealing');
            return 15;
          }
          return prev - 2;
        });
      }
    }, 25);

    return () => clearInterval(interval);
  }, [phase]);

  const sizeClasses = sample.size === 'large'
    ? 'w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80'
    : 'w-54 h-54 sm:w-64 sm:h-64 lg:w-72 lg:h-72';

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
      {/* 多重グロー効果 */}
      <div className="absolute -inset-8 bg-gradient-to-br from-secondary/40 via-transparent to-primary/30 rounded-[2rem] blur-3xl opacity-70 animate-pulse-slow" />
      <div className="absolute -inset-4 bg-gradient-radial from-secondary/20 to-transparent rounded-3xl blur-2xl" />

      {/* 装飾フレーム - ゴールドアクセント */}
      <div className="absolute -inset-2 border-2 border-secondary/30 rounded-2xl" />
      <div className="absolute -inset-4 border border-secondary/10 rounded-3xl" />

      {/* メイン画像コンテナ */}
      <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
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

        {/* After Image (円形リビール) */}
        <div
          className="absolute inset-0 overflow-hidden transition-all duration-75 ease-out"
          style={{
            clipPath: `circle(${revealProgress * 1.5}% at 50% 50%)`
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

          {/* ゴールドシマー */}
          <div
            className="absolute inset-0 bg-gradient-to-tr from-secondary/50 via-transparent to-secondary/40 mix-blend-overlay transition-opacity duration-300"
            style={{ opacity: revealProgress < 100 ? 0.8 : 0 }}
          />
        </div>

        {/* 内側グロー */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5 pointer-events-none" />

        {/* コーナーアクセント - 金箔風 */}
        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-secondary/60 rounded-tl" />
        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-secondary/60 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-secondary/60 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-secondary/60 rounded-br" />

        {/* スタイルラベル */}
        <div className={`
          absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2
          bg-gradient-to-r from-secondary via-secondary to-secondary/90
          text-white text-xs font-semibold rounded-full shadow-xl whitespace-nowrap
          transition-all duration-500 backdrop-blur-sm
          ${revealProgress > 60 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayCategory, setDisplayCategory] = useState(selectedCategory);

  // カテゴリ変更時のトランジション
  useEffect(() => {
    if (selectedCategory !== displayCategory) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayCategory(selectedCategory);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, displayCategory]);

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
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-card/20 to-background">
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
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-secondary/5 blur-[80px] animate-float-slow" />

        {/* 装飾線 - より洗練されたデザイン */}
        <svg className="absolute top-16 right-[8%] w-40 h-40 text-secondary/15" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 6" className="animate-spin-slow" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 4" />
        </svg>

        <svg className="absolute bottom-20 left-[8%] w-32 h-32 text-primary/15" viewBox="0 0 100 100">
          <path d="M10 50 L50 10 L90 50 L50 90 Z" fill="none" stroke="currentColor" strokeWidth="0.4" className="animate-pulse-slow" />
          <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="none" stroke="currentColor" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="0.3" />
        </svg>

        {/* 追加装飾 */}
        <div className="absolute top-1/2 left-[15%] w-px h-32 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <div className="absolute top-1/4 right-[20%] w-px h-24 bg-gradient-to-b from-transparent via-secondary/15 to-transparent" />

        <FloatingParticles />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">

          {/* 左: パララックス画像エリア */}
          <div className={`relative h-[420px] sm:h-[480px] lg:h-[540px] order-1 lg:order-1 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {samples.map((sample, index) => (
              <ParallaxCard key={`${displayCategory}-${sample.id}`} sample={sample} index={index} />
            ))}
          </div>

          {/* 右: コピー */}
          <div className={`text-center lg:text-left space-y-6 lg:space-y-8 order-2 lg:order-2 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-center lg:justify-start gap-3 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              <div className="w-10 h-px bg-gradient-to-r from-transparent to-secondary" />
              <span className="text-secondary text-xs sm:text-sm tracking-[0.3em] uppercase font-semibold">
                AI Portrait Art
              </span>
              <div className="w-10 h-px bg-gradient-to-l from-transparent to-secondary" />
            </div>

            <h1 className="font-serif text-[2rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold text-foreground leading-[1.15] tracking-wide animate-fadeIn" style={{ animationDelay: '0.5s' }}>
              <span className="block">{currentCategory?.headline.split('、')[0] || '1枚の写真が'}、</span>
              <span className="block mt-1 lg:mt-2 bg-gradient-to-r from-foreground via-foreground to-secondary bg-clip-text">
                {currentCategory?.headline.split('、')[1] || '世界に一つのアートに'}
              </span>
            </h1>

            <p className="text-muted text-base sm:text-lg lg:text-xl leading-relaxed max-w-md mx-auto lg:mx-0 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
              AIが描く、あなただけの肖像画。
              <br className="hidden sm:block" />
              {currentCategory?.subheadline || '大切な写真を、美しい芸術作品に変えます。'}
            </p>

            {/* CTA ボタン */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fadeIn" style={{ animationDelay: '0.9s' }}>
              <button
                onClick={scrollToUpload}
                className="group px-8 py-4 bg-gradient-to-r from-secondary to-secondary/90 text-white font-semibold rounded-full shadow-xl shadow-secondary/25 hover:shadow-secondary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                今すぐ作成する
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <span className="text-sm text-muted">
                無料でお試し・登録不要
              </span>
            </div>

            {/* 信頼指標 */}
            <div className="flex items-center justify-center lg:justify-start gap-6 text-sm animate-fadeIn pt-2" style={{ animationDelay: '1.1s' }}>
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-secondary fill-secondary" />
                ))}
                <span className="ml-2 text-foreground font-bold">4.9</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <span className="text-muted">
                {currentCategory?.trustText || '多くのお客様に選ばれています'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted/40 animate-bounce">
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
