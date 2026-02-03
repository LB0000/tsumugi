import { memo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { ArtStyle } from '../../../types';

interface StyleCardProps {
  style: ArtStyle;
  isSelected: boolean;
  onSelect: (style: ArtStyle) => void;
  index?: number;
}

function ColorPaletteStrip({ colors }: { colors: string[] }) {
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
      className="h-2 w-full rounded-full overflow-hidden"
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
  index = 0
}: StyleCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const staggerClass = index < 8 ? `stagger-${index + 1}` : '';

  return (
    <button
      onClick={() => onSelect(style)}
      aria-pressed={isSelected}
      aria-label={`${style.name}スタイルを選択${isSelected ? '（選択中）' : ''}`}
      className={`
        group relative w-full text-left rounded-2xl overflow-hidden cursor-pointer
        animate-cardEnter ${staggerClass}
        transition-all duration-300 ease-out
        active:scale-[0.98] active:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${isSelected ? 'glass-card-selected' : 'glass-card'}
      `}
    >
      {/* 選択チェックマーク */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full selection-check flex items-center justify-center animate-scaleIn shadow-lg">
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      )}

      {/* サムネイル */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/5">
        {style.isIntelligent ? (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/15 transition-colors duration-500">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-primary animate-floatUp group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-primary/20 blur-3xl" />
            </div>
          </div>
        ) : style.thumbnailUrl && !imageError ? (
          <>
            {/* スケルトンローダー */}
            {!imageLoaded && <ImageSkeleton />}
            <img
              loading="lazy"
              src={style.thumbnailUrl}
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

        {/* Tier バッジ（視認性改善） */}
        {style.tier !== 'free' && (
          <span
            className={`
              absolute bottom-3 left-3 px-3 py-1.5 text-[10px] font-bold
              rounded-full tracking-wider
              shadow-lg
              ${style.tier === 'studio'
                ? 'bg-gradient-to-r from-amber-500/90 to-yellow-500/90 text-white'
                : 'bg-gradient-to-r from-primary/90 to-primary/80 text-white'
              }
            `}
          >
            {style.tier === 'studio' ? 'STUDIO' : 'STARTER'}
          </span>
        )}
      </div>

      {/* 情報エリア */}
      <div className="p-4">
        {/* スタイル名 */}
        <h3 className="font-serif font-semibold text-foreground text-base mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
          {style.name}
        </h3>

        {/* 説明 */}
        <p className="text-sm text-muted line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
          {style.description}
        </p>

        {/* カラーパレット */}
        <ColorPaletteStrip colors={style.colorPalette} />
      </div>

      {/* 選択時のボーダーグロー */}
      {isSelected && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 ring-inset pointer-events-none" />
      )}
    </button>
  );
});
