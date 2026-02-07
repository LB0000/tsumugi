import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Sparkles, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { artStyles } from '../../data/artStyles';
import type { ArtStyle } from '../../types';

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
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: `linear-gradient(90deg, ${gradient})` }}
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

function StyleCardMini({ style, isSelected, onClick, index }: {
  style: ArtStyle;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${style.name}スタイルを選択${isSelected ? '（選択中）' : ''}`}
      className={`
        group relative flex-shrink-0 w-48 rounded-2xl overflow-hidden cursor-pointer
        animate-cardEnter
        transition-all duration-300 ease-out
        active:scale-[0.98] active:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${isSelected ? 'glass-card-selected' : 'glass-card'}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 選択チェックマーク */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full selection-check flex items-center justify-center animate-scaleIn shadow-lg">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* サムネイル */}
      <div className="relative aspect-square overflow-hidden bg-muted/5">
        {style.isIntelligent ? (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/15 transition-colors duration-500">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-primary animate-floatUp group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-primary/20 blur-2xl" />
            </div>
          </div>
        ) : style.thumbnailUrl && !imageError ? (
          <>
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

        {/* Tier バッジ */}
        {style.tier !== 'free' && (
          <span
            className={`
              absolute bottom-2 left-2 px-2 py-1 text-[9px] font-bold
              rounded-full tracking-wider shadow-lg
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

      {/* スタイル情報 */}
      <div className="p-3 text-center">
        <h3 className="font-serif font-semibold text-foreground text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">
          {style.name}
        </h3>
        <p className="text-xs text-muted line-clamp-2 mb-2 leading-relaxed min-h-[2rem]">
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
}

export function StyleSection() {
  const { selectedStyle, setSelectedStyle, openStyleModal } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 8);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  // ピークアニメーション（モバイル初回表示時）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    handleScroll();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && el.scrollWidth > el.clientWidth) {
      const timer = setTimeout(() => {
        el.scrollTo({ left: 40, behavior: 'smooth' });
        setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 600);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [handleScroll]);

  const handleStyleClick = (style: ArtStyle) => {
    setSelectedStyle(style);
    openStyleModal();
  };

  return (
    <section className="mb-12">
      {/* すべて見るボタン */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openStyleModal}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all group cursor-pointer"
        >
          すべて見る ({artStyles.length}種類)
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 横スクロールコンテナ */}
      <div className="relative">
        {/* 左フェードグラデーション */}
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-300" />
        )}

        <div ref={scrollRef} onScroll={handleScroll} className="flex gap-5 overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent -mx-1">
        {artStyles.slice(0, 6).map((style, index) => (
          <StyleCardMini
            key={style.id}
            style={style}
            isSelected={selectedStyle?.id === style.id}
            onClick={() => handleStyleClick(style)}
            index={index}
          />
        ))}

        {/* View All Card */}
        <button
          onClick={openStyleModal}
          className="
            flex-shrink-0 w-36 rounded-2xl glass-card
            border-2 border-dashed border-primary/30
            flex flex-col items-center justify-center gap-3
            hover:border-primary/50 hover:bg-primary/5
            active:scale-[0.98]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-all duration-300 group cursor-pointer
          "
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <span className="text-2xl text-primary">+</span>
          </div>
          <span className="text-sm font-medium text-primary">
            もっと見る
          </span>
          <span className="text-xs text-muted">
            {artStyles.length}種類
          </span>
        </button>
      </div>

        {/* 右フェードグラデーション */}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-300" />
        )}
      </div>
    </section>
  );
}
