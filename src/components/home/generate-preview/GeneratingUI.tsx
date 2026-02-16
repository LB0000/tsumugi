import { X } from 'lucide-react';
import { CircularProgress } from '../CircularProgress';
import { StyleInfoPanel } from '../StyleInfoPanel';
import { generationStages, getEncouragingMessage } from './generationStages';
import type { ArtStyle } from '../../../types';

interface GeneratingUIProps {
  smoothProgress: number;
  generationStage: number;
  uploadPreviewUrl: string;
  progressColors: [string, string];
  selectedStyle: ArtStyle;
  currentInfoPanel: number;
  currentFact: number;
  onCancel: () => void;
}

export function GeneratingUI({
  smoothProgress,
  generationStage,
  uploadPreviewUrl,
  progressColors,
  selectedStyle,
  currentInfoPanel,
  currentFact,
  onCancel,
}: GeneratingUIProps) {
  return (
    <div className="w-full space-y-6">
      {/* サークルプログレス + 写真 */}
      <CircularProgress
        progress={smoothProgress}
        colors={progressColors}
      >
        <div className="relative">
          <img
            src={uploadPreviewUrl}
            alt="生成中"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-background shadow-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 backdrop-blur-[2px]">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-white">
              {Math.round(smoothProgress)}%
            </span>
          </div>
        </div>
      </CircularProgress>

      {/* ステージ表示 */}
      <div className="flex items-center justify-between px-1" aria-live="polite">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full border-2 border-primary/20 animate-stageIconSpin" />
            {(() => {
              const StageIcon = generationStages[generationStage].icon;
              return <StageIcon className="w-6 h-6 text-primary relative" />;
            })()}
          </div>
          <span
            className="font-medium text-foreground text-sm sm:text-base animate-slideInFromLeft truncate"
            key={generationStage}
          >
            {generationStages[generationStage].label}
          </span>
        </div>
        <span
          className="text-xs text-secondary shrink-0 ml-3 animate-fadeIn"
          key={`msg-${generationStage}`}
        >
          {getEncouragingMessage(generationStage)}
        </span>
      </div>

      {/* マイクロステージ ドットインジケーター */}
      <div className="flex justify-center gap-1">
        {generationStages.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx <= generationStage
                ? 'w-5 bg-gradient-to-r from-primary to-secondary'
                : 'w-1.5 bg-muted/20'
            }`}
          />
        ))}
      </div>

      {/* スタイル連動インフォパネル */}
      <StyleInfoPanel
        key={currentInfoPanel}
        panelIndex={currentInfoPanel}
        style={selectedStyle}
        factIndex={currentFact}
      />

      {/* 浮遊パーティクル装飾 */}
      <div className="relative h-0 pointer-events-none" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-secondary/20 animate-floatUp"
            style={{
              left: `${10 + i * 20}%`,
              bottom: '0',
              animationDelay: `${i * 0.7}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>

      {/* キャンセルボタン */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mx-auto"
      >
        <X className="w-4 h-4" />
        キャンセル
      </button>
    </div>
  );
}
