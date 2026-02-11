import { useState, useEffect, useRef } from 'react';

const metrics = [
  { value: 10000, suffix: '+', label: '作品を生成' },
  { value: 4.9, suffix: '/5.0', label: '平均評価', decimals: 1 },
  { value: 98, suffix: '%', label: '満足度' },
];

function AnimatedNumber({
  target,
  suffix,
  decimals = 0,
  isVisible,
}: {
  target: number;
  suffix: string;
  decimals?: number;
  isVisible: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1800;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(target * eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDone(true);
      }
    }

    requestAnimationFrame(animate);
  }, [isVisible, target]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.round(current).toLocaleString();

  return (
    <span className={`inline-flex items-baseline gap-0.5 transition-transform duration-300 ${done ? 'scale-100' : 'scale-[0.97]'}`}>
      <span className="text-gradient-gold">{formatted}</span>
      <span className="text-gradient-gold text-[0.6em] font-semibold opacity-50">{suffix}</span>
    </span>
  );
}

export function TrustedBy() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative py-8 sm:py-10 overflow-hidden">
      {/* 背景 — 金箔を散らした帯 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/[0.04] to-transparent" />
        {/* 上下の金線 */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-secondary/25 to-transparent" />
        {/* シマー — カウントアップ完了後に一度だけ流れる */}
        <div
          className={`
            absolute inset-0
            bg-gradient-to-r from-transparent via-secondary/[0.08] to-transparent
            ${isVisible ? 'animate-[shimmerOnce_2s_ease-in-out_1.8s_forwards]' : 'opacity-0'}
          `}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-center">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="flex items-center">
              {/* メトリクス */}
              <div
                className={`
                  group text-center px-4 sm:px-10 py-2
                  transition-all duration-700
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: `${index * 180}ms` }}
              >
                <div className="font-serif text-[1.75rem] sm:text-4xl font-bold tracking-tight mb-1.5 transition-transform duration-300 group-hover:scale-105">
                  <AnimatedNumber
                    target={metric.value}
                    suffix={metric.suffix}
                    decimals={metric.label === '平均評価' ? 1 : 0}
                    isVisible={isVisible}
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-3 h-px bg-secondary/40 hidden sm:block" />
                  <span className="text-[11px] sm:text-sm text-muted tracking-[0.15em]">
                    {metric.label}
                  </span>
                  <span className="w-3 h-px bg-secondary/40 hidden sm:block" />
                </div>
              </div>

              {/* 区切り — 菱形アクセント付き */}
              {index < metrics.length - 1 && (
                <div
                  className={`
                    flex flex-col items-center gap-1.5
                    transition-all duration-700
                    ${isVisible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
                  `}
                  style={{ transitionDelay: `${index * 180 + 90}ms` }}
                >
                  <div className="w-px h-4 bg-gradient-to-b from-transparent to-secondary/30" />
                  <div className="w-1.5 h-1.5 rotate-45 bg-secondary/30" />
                  <div className="w-px h-4 bg-gradient-to-t from-transparent to-secondary/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ワンタイムシマーのキーフレーム */}
      <style>{`
        @keyframes shimmerOnce {
          0% { transform: translateX(-100%); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
