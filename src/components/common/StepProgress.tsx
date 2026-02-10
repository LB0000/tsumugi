import { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Upload, Palette, Sparkles } from 'lucide-react';

interface StepProgressProps {
  hasUpload: boolean;
  hasStyle: boolean;
  hasGenerated: boolean;
}

const steps = [
  { label: '写真をアップロード', icon: Upload, sectionId: 'upload-section' },
  { label: 'スタイルを選択', icon: Palette, sectionId: 'style-section' },
  { label: '肖像画を生成', icon: Sparkles, sectionId: 'generate-section' },
];

export function StepProgress({ hasUpload, hasStyle, hasGenerated }: StepProgressProps) {
  const completedCount = [hasUpload, hasStyle, hasGenerated].filter(Boolean).length;
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedRef = useRef(false);

  // コンフェッティのランダム値を一度だけ計算
  const confettiParams = useMemo(() =>
    Array.from({ length: 16 }, () => ({
      x: `${(Math.random() - 0.5) * 200}px`,
      r: `${Math.random() * 720}deg`,
    })),
  []);

  // 3ステップ完了時のセレブレーション（1回のみ）
  useEffect(() => {
    if (completedCount === 3 && !celebratedRef.current) {
      celebratedRef.current = true;
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [completedCount]);

  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (index === 0) {
      if (hasUpload) return 'completed';
      return 'current'; // 付与された進捗: 最初から「進行中」
    }
    if (index === 1) {
      if (hasStyle) return 'completed';
      if (hasUpload) return 'current';
      return 'pending';
    }
    if (index === 2) {
      if (hasGenerated) return 'completed';
      if (hasUpload && hasStyle) return 'current';
      return 'pending';
    }
    return 'pending';
  };

  const handleStepClick = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* 進捗カウンター */}
      <p className="text-center text-sm text-muted mb-4">
        <span className="font-semibold text-primary">{completedCount}</span>
        <span className="text-muted/70"> / 3 完了</span>
      </p>

      <div className="flex items-center justify-between relative">
        {/* コネクティングライン（背景） */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-border/50" />
        {/* コネクティングライン（進捗） */}
        <div
          className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out"
          style={{ width: `${Math.min(completedCount / 2, 1) * 80}%` }}
        />

        {/* セレブレーションパーティクル */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-confetti"
                style={{
                  backgroundColor: i % 3 === 0 ? '#B8860B' : i % 3 === 1 ? '#8B4513' : '#C53D43',
                  animationDelay: `${i * 0.06}s`,
                  '--confetti-x': confettiParams[i].x,
                  '--confetti-r': confettiParams[i].r,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const Icon = step.icon;

          return (
            <button
              key={index}
              onClick={() => handleStepClick(step.sectionId)}
              className="flex flex-col items-center gap-2 relative z-10 cursor-pointer group"
              aria-label={`${step.label}${status === 'completed' ? '（完了）' : status === 'current' ? '（進行中）' : ''}`}
            >
              {/* ステップサークル */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-500 ease-out
                  group-hover:scale-110
                  ${status === 'completed'
                    ? 'bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20 animate-scaleIn'
                    : status === 'current'
                      ? 'bg-gradient-to-br from-secondary/20 to-primary/10 border-2 border-secondary shadow-sm animate-stepActivate'
                      : 'bg-card border-2 border-border/50'
                  }
                `}
              >
                {status === 'completed' ? (
                  <Check className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                ) : (
                  <Icon
                    className={`w-4.5 h-4.5 transition-colors duration-300 ${
                      status === 'current' ? 'text-secondary' : 'text-muted/50'
                    }`}
                  />
                )}
                {/* 現在ステップのパルスリング */}
                {status === 'current' && (
                  <div className="absolute inset-0 rounded-full border-2 border-secondary/40 animate-pulse" />
                )}
              </div>

              {/* ラベル */}
              <span
                className={`text-xs font-medium transition-colors duration-300 whitespace-nowrap ${
                  status === 'completed'
                    ? 'text-primary'
                    : status === 'current'
                      ? 'text-foreground'
                      : 'text-muted/50'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
