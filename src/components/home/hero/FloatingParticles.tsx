import { useState, useEffect } from 'react';

export function FloatingParticles() {
  const [particleCount, setParticleCount] = useState(12);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // メディアクエリを一度だけ作成（リサイズ時の再作成を防ぐ）
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    // モバイル検出とprefers-reduced-motion対応
    const checkEnvironment = () => {
      const isMobile = window.innerWidth < 640;
      setPrefersReducedMotion(mql.matches);
      setParticleCount(isMobile ? 6 : 12);
    };

    checkEnvironment();
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // リサイズを監視（requestAnimationFrameでスロットリング）
    let rafId: number;
    const throttledResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkEnvironment);
    };

    mql.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', throttledResize);

    return () => {
      mql.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', throttledResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // アニメーション無効時は非表示
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(particleCount)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-secondary/40 rounded-full hero-animate-float-particle"
          style={{
            left: `${10 + (i * 7)}%`,
            top: `${15 + (i % 4) * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}
