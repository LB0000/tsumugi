import { FloatingParticles } from './FloatingParticles';

export function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* メイングラデーション */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vw] h-[180vh] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12)_0%,transparent_60%)]" />

      {/* サブグラデーション */}
      <div className="absolute top-0 right-0 w-[100vw] h-[100vh] bg-[radial-gradient(ellipse_at_top_right,rgba(139,69,19,0.08)_0%,transparent_50%)]" />
      <div className="absolute bottom-0 left-0 w-[80vw] h-[80vh] bg-[radial-gradient(ellipse_at_bottom_left,rgba(212,175,55,0.06)_0%,transparent_50%)]" />

      {/* 七宝テキスタイル */}
      <div
        className="absolute inset-0 bg-shippo opacity-[0.06]"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)',
        }}
      />

      {/* 浮遊するぼかし円 */}
      <div className="absolute top-16 left-[5%] w-80 h-80 rounded-full bg-secondary/8 blur-[100px] hero-animate-float" />
      <div className="absolute bottom-16 right-[5%] w-[30rem] h-[30rem] rounded-full bg-primary/6 blur-[120px] hero-animate-float-delayed" />
      <div className="hidden sm:block absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-secondary/5 blur-[80px] hero-animate-float-slow" />

      {/* 装飾線 — デスクトップのみ */}
      <svg className="hidden sm:block absolute top-16 right-[8%] w-40 h-40 text-secondary/15" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 6" className="hero-animate-spin-slow" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 4" />
      </svg>

      <svg className="hidden sm:block absolute bottom-20 left-[8%] w-32 h-32 text-primary/15" viewBox="0 0 100 100">
        <path d="M10 50 L50 10 L90 50 L50 90 Z" fill="none" stroke="currentColor" strokeWidth="0.4" className="hero-animate-pulse-slow" />
        <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="0.3" />
      </svg>

      {/* 追加装飾 — デスクトップのみ */}
      <div className="hidden sm:block absolute top-1/2 left-[15%] w-px h-32 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
      <div className="hidden sm:block absolute top-1/4 right-[20%] w-px h-24 bg-gradient-to-b from-transparent via-secondary/15 to-transparent" />

      <FloatingParticles />
    </div>
  );
}
