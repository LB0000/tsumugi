import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Crown, Leaf, Grid3X3, ArrowRight, X } from 'lucide-react';
import { galleryItems, type GalleryItem } from '../../data/galleryItems';
import { artStyles } from '../../data/artStyles';
import { useAppStore } from '../../stores/appStore';
import type { StyleCategoryId } from '../../types';

const filterTabs: { id: StyleCategoryId; name: string; icon: typeof Grid3X3 }[] = [
  { id: 'all', name: 'すべて', icon: Grid3X3 },
  { id: 'western', name: '西洋絵画', icon: Crown },
  { id: 'japanese', name: '和風・東洋', icon: Leaf },
  { id: 'pop', name: 'ポップ', icon: Sparkles },
];

// ── Before/After スライダー付きライトボックス ──
function Lightbox({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    };
    const handleUp = () => { isDragging.current = false; };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, updatePosition]);

  // body スクロール抑制
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-2xl aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Before (full) */}
        <img src={item.beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-cover" />

        {/* After (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
          <img src={item.afterImage} alt="After" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        {/* スライダーハンドル */}
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-col-resize"
          onMouseDown={(e) => { isDragging.current = true; updatePosition(e.clientX); }}
          onTouchStart={(e) => { isDragging.current = true; updatePosition(e.touches[0].clientX); }}
        >
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center">
              <div className="flex items-center gap-0.5 text-foreground">
                <span className="text-[10px]">◀</span>
                <span className="text-[10px]">▶</span>
              </div>
            </div>
          </div>
        </div>

        {/* Before/After ラベル */}
        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-foreground text-xs font-semibold shadow">Before</span>
        <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-secondary/90 text-white text-xs font-semibold shadow">After</span>

        {/* 情報バー */}
        <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-white text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              {item.styleName}
            </span>
            <span className="text-white text-sm font-medium">{item.label}</span>
          </div>
        </div>

        {/* 閉じるボタン */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 hidden" aria-label="閉じる">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 外側の閉じるボタン */}
      <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer" aria-label="閉じる">
        <X className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

// ── ギャラリーカード ──
function GalleryCard({ item, index, onOpenLightbox }: {
  item: GalleryItem;
  index: number;
  onOpenLightbox: (item: GalleryItem) => void;
}) {
  const [showAfter, setShowAfter] = useState(false);
  const { setSelectedStyle } = useAppStore();

  const handleStyleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const style = artStyles.find(s => s.name === item.styleName);
    if (style) setSelectedStyle(style);
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden group cursor-pointer border-2 border-border/50 hover:border-secondary/40 transition-all duration-300 hover:shadow-xl hover:shadow-secondary/10 hover:-translate-y-1"
      style={{ animation: `galleryFadeIn 0.4s ease-out ${index * 60}ms both` }}
      onMouseEnter={() => setShowAfter(true)}
      onMouseLeave={() => setShowAfter(false)}
    >
      {/* 画像エリア */}
      <div
        className="relative aspect-square sm:aspect-[4/5] overflow-hidden"
        onClick={() => onOpenLightbox(item)}
      >
        {/* Before Image */}
        <img
          loading="lazy"
          src={item.beforeImage}
          alt={`${item.label} - 元の写真`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showAfter ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* After Image */}
        <img
          loading="lazy"
          src={item.afterImage}
          alt={`${item.label} - ${item.styleName}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showAfter ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Before/After インジケーター */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
          <span className={`
            inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wide shadow-lg backdrop-blur-sm transition-all duration-300
            ${showAfter
              ? 'bg-secondary/90 text-white'
              : 'bg-white/90 text-foreground'
            }
          `}>
            {showAfter ? 'After' : 'Before'}
          </span>
        </div>

        {/* 下部グラデーション（控えめに） */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* スタイル名バッジ（オーバーレイ内に残す） */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/80 text-white text-[10px] font-semibold backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5" />
            {item.styleName}
          </span>
        </div>
      </div>

      {/* 情報 + CTA エリア（画像の外） */}
      <div className="p-2.5 sm:p-3 bg-card">
        <p className="text-foreground text-xs sm:text-sm font-medium leading-tight mb-2 line-clamp-1">
          {item.label}
        </p>
        <button
          onClick={handleStyleSelect}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-primary/10 text-primary text-[11px] sm:text-xs font-semibold hover:bg-primary/20 transition-all duration-300 cursor-pointer"
        >
          このスタイルで作る
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── メインギャラリー ──
export const SampleGallery = memo(function SampleGallery() {
  const [activeFilter, setActiveFilter] = useState<StyleCategoryId>('all');
  const [showAll, setShowAll] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingFilter = useRef<StyleCategoryId | null>(null);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return galleryItems;
    return galleryItems.filter(item => item.styleCategory === activeFilter);
  }, [activeFilter]);

  const displayed = showAll ? filtered : filtered.slice(0, 6);

  const handleFilterChange = (id: StyleCategoryId) => {
    if (id === activeFilter) return;
    pendingFilter.current = id;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveFilter(id);
      setShowAll(false);
      setAnimKey(prev => prev + 1);
      setIsTransitioning(false);
      pendingFilter.current = null;
    }, 150);
  };

  return (
    <div>
      {/* フィルタータブ */}
      <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
        {filterTabs.map(tab => {
          const count = tab.id === 'all'
            ? galleryItems.length
            : galleryItems.filter(i => i.styleCategory === tab.id).length;
          const isActive = activeFilter === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium
                transition-all duration-300 cursor-pointer
                ${isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card text-muted hover:text-foreground hover:bg-card-hover border border-border'
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.name}
              <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ギャラリーグリッド */}
      <div key={animKey} className={`grid grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {displayed.map((item, index) => (
          <GalleryCard
            key={item.id}
            item={item}
            index={index}
            onOpenLightbox={setLightboxItem}
          />
        ))}
      </div>

      {/* もっと見る */}
      {!showAll && filtered.length > 6 && (
        <div className="text-center mt-8">
          <button
            onClick={() => { setShowAll(true); setAnimKey(prev => prev + 1); }}
            className="px-6 py-2.5 text-sm font-medium text-secondary border border-secondary/30 rounded-full hover:bg-secondary/5 transition-all duration-300 cursor-pointer"
          >
            もっと見る（残り {filtered.length - 6} 点）
          </button>
        </div>
      )}

      {/* ライトボックス */}
      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      )}

      {/* アニメーション */}
      <style>{`
        @keyframes galleryFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});
