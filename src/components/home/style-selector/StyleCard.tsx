import { memo, useState, useMemo } from 'react';
import { Check, Sparkles, Flame } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { getStyleThumbnail } from '../../../data/artStyles';
import type { ArtStyle } from '../../../types';

interface StyleCardProps {
  style: ArtStyle;
  isSelected: boolean;
  onSelect: (style: ArtStyle) => void;
  index?: number;
  compact?: boolean;
}

function ColorPaletteStrip({ colors, compact = false }: { colors: string[]; compact?: boolean }) {
  if (colors.length === 0) return null;

  const gradient = colors
    .map((color, i) => {
      const start = (i / colors.length) * 100;
      const end = ((i + 1) / colors.length) * 100;
      return `${color} ${start}%, ${color} ${end}%`;
    })
    .join(', ');

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${compact ? 'h-1 sm:h-1.5' : 'h-2'}`}
      style={{ background: `linear-gradient(90deg, ${gradient})` }}
      aria-label="カラーパレット"
    />
  );
}

function ImageSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-muted/20 to-muted/10 animate-pulse">
      <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  );
}

export const StyleCard = memo(function StyleCard({
  style,
  isSelected,
  onSelect,
  index = 0,
  compact = false
}: StyleCardProps) {
  const selectedCategory = useAppStore(s => s.selectedCategory);
  const thumbnailUrl = useMemo(() => getStyleThumbnail(style, selectedCategory), [style, selectedCategory]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const staggerClass = index < 8 ? `stagger-${index + 1}` : '';

  const handleSelect = () => {
    setShowBounce(true);
    setShowParticles(true);
    setTimeout(() => setShowBounce(false), 400);
    setTimeout(() => setShowParticles(false), 700);
    onSelect(style);
  };

  return (
    <button
      onClick={handleSelect}
      aria-pressed={isSelected}
      aria-label={`${style.name}スタイルを選択${isSelected ? '（選択中）' : ''}`}
      className={`
        group relative w-full text-left rounded-2xl overflow-hidden cursor-pointer
        animate-cardEnter ${staggerClass}
        transition-all duration-300 ease-out
        active:scale-[0.98] active:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${isSelected ? 'glass-card-selected' : 'glass-card'}
        ${showBounce ? 'animate-selectBounce' : ''}
      `}
    >
      {/* パーティクルバースト */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-particleBurst"
              style={{
                backgroundColor: i % 2 === 0 ? '#B8860B' : '#8B4513',
                '--particle-angle': `${i * 36}deg`,
                animationDelay: `${i * 0.03}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* NEWバッジ */}
      {style.isNew && !isSelected && (
        <span className={`absolute z-10 rounded-full bg-accent-sage text-white tracking-wider shadow-sm animate-newBadgePulse font-bold ${compact ? 'top-1 left-1 px-1 py-0.5 text-[6px] sm:top-2 sm:left-2 sm:px-1.5 sm:text-[7px]' : 'top-3 left-3 px-2 py-0.5 text-[8px]'}`}>
          NEW
        </span>
      )}

      {/* 選択チェックマーク */}
      {isSelected && (
        <div className={`absolute z-10 rounded-full selection-check flex items-center justify-center animate-scaleIn shadow-lg ${compact ? 'top-1 right-1 w-5 h-5 sm:top-2 sm:right-2 sm:w-6 sm:h-6' : 'top-3 right-3 w-8 h-8'}`}>
          <Check className={compact ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 text-white' : 'w-4 h-4 text-white'} strokeWidth={3} />
        </div>
      )}

      {/* サムネイル */}
      <div className={`relative overflow-hidden bg-muted/5 ${compact ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {style.isIntelligent ? (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/15 transition-colors duration-500">
            <div className="relative">
              <Sparkles className={`text-primary animate-floatUp group-hover:scale-110 transition-transform duration-500 ${compact ? 'w-10 h-10' : 'w-16 h-16'}`} />
              <div className="absolute inset-0 bg-primary/20 blur-3xl" />
            </div>
          </div>
        ) : thumbnailUrl && !imageError ? (
          <>
            {/* スケルトンローダー */}
            {!imageLoaded && <ImageSkeleton />}
            <img
              loading="lazy"
              src={thumbnailUrl}
              alt={style.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`
                w-full h-full object-cover
                transition-all duration-500 ease-out
                group-hover:scale-105
                ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
              `}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/10 group-hover:from-secondary/30 group-hover:to-primary/20 transition-colors duration-500" />
        )}

        {/* ホバーオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      </div>

      {/* 情報エリア */}
      <div className={compact ? 'p-1.5 sm:p-2.5' : 'p-4'}>
        {/* スタイル名 */}
        <h3 className={`font-serif font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300 flex items-center gap-1 ${compact ? 'text-xs sm:text-sm mb-0.5 sm:mb-1' : 'text-base mb-1.5'}`}>
          {style.name}
          {style.popularity && style.popularity >= 80 && (
            <Flame className="w-3 h-3 text-secondary flex-shrink-0" />
          )}
        </h3>

        {/* 説明（compactモードでは非表示） */}
        {!compact && (
          <p className="text-sm text-muted line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
            {style.description}
          </p>
        )}

        {/* カラーパレット */}
        <ColorPaletteStrip colors={style.colorPalette} compact={compact} />
      </div>

      {/* ホバー拡大プレビュー（デスクトップ・compact時のみ） */}
      {compact && !style.isIntelligent && thumbnailUrl && (
        <div className="hidden md:block absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 delay-300">
          <div className="w-56 rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-background">
            <img src={thumbnailUrl} alt="" className="w-full aspect-[4/5] object-cover" />
            <div className="p-3">
              <p className="font-serif font-semibold text-sm">{style.name}</p>
              <p className="text-xs text-muted mt-1 line-clamp-2">{style.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* 選択時のボーダーグロー */}
      {isSelected && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 ring-inset pointer-events-none" />
      )}
    </button>
  );
});
