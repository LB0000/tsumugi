import { useState, useEffect } from 'react';
import { Sparkles, ImageIcon } from 'lucide-react';
import type { TransformationSample } from './heroSamples';

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-card via-card/80 to-muted/20 flex flex-col items-center justify-center">
      <ImageIcon className="w-12 h-12 text-muted/40 mb-2" />
      <p className="text-muted/60 text-xs text-center px-2">{label}</p>
    </div>
  );
}

export function ParallaxCard({ sample, index }: { sample: TransformationSample; index: number }) {
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

  const sizeClasses = 'w-44 h-44 sm:w-[17rem] sm:h-[17rem] lg:w-[19rem] lg:h-[19rem]';

  const zIndex = sample.size === 'large' ? 'z-20' : 'z-10';
  const mobileTranslateX = index === 0 ? '-95%' : '-5%';

  return (
    <div
      className={`absolute ${sizeClasses} ${zIndex} transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        left: isMobile ? '50%' : sample.position.x,
        top: isMobile ? sample.mobilePosition.y : sample.position.y,
        transform: isMobile
          ? `translateX(${mobileTranslateX}) rotate(${sample.rotation}deg)`
          : `rotate(${sample.rotation}deg)`,
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
            clipPath: showAfter ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
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
