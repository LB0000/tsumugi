import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Search, Grid3X3, Crown, Leaf, Sparkles, Wand2, Monitor } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { artStyles, getStyleThumbnail } from '../../data/artStyles';
import { styleCategories } from '../../data/styleCategories';
import { StyledButton } from '../common/StyledButton';
import { StyleCategoryCarousel } from './style-selector/StyleCategoryCarousel';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid3X3, Crown, Leaf, Sparkles, Wand2, Monitor
};

export function StyleModal() {
  const {
    isStyleModalOpen,
    closeStyleModal,
    selectedStyle,
    setSelectedStyle,
    selectedCategory,
    styleFilterState,
    setStyleSearchQuery
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<string>('');
  const mainRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // フィルタリング
  const filteredStyles = useMemo(() => {
    return artStyles.filter((style) => {
      // カテゴリ別フィルター（ペット専用スタイルなど）
      if (style.availableCategories && !style.availableCategories.includes(selectedCategory)) {
        return false;
      }

      // 検索クエリ
      if (styleFilterState.searchQuery) {
        const query = styleFilterState.searchQuery.toLowerCase();
        const matchesName = style.name.toLowerCase().includes(query);
        const matchesDescription = style.description.toLowerCase().includes(query);
        const matchesTags = style.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [styleFilterState, selectedCategory]);

  // カテゴリごとにスタイルをグループ化
  const stylesByCategory = useMemo(() => {
    const categories = styleCategories.filter(c => c.id !== 'all');
    return categories.map(category => ({
      category,
      styles: filteredStyles.filter(style => style.category === category.id)
    })).filter(group => group.styles.length > 0);
  }, [filteredStyles]);

  // カテゴリごとのスタイル数
  const styleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    styleCategories.filter(c => c.id !== 'all').forEach(cat => {
      counts[cat.id] = filteredStyles.filter(s => s.category === cat.id).length;
    });
    return counts;
  }, [filteredStyles]);

  // IntersectionObserverでアクティブカテゴリを検出
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        const categoryId = entry.target.id.replace('style-category-', '');
        setActiveCategory(categoryId);
      }
    }
  }, []);

  useEffect(() => {
    if (!isStyleModalOpen) return;

    let observer: IntersectionObserver | null = null;

    // DOMがレンダリングされるのを待つ
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(observerCallback, {
        root: mainRef.current,
        threshold: 0.3
      });

      const cats = styleCategories.filter(c => c.id !== 'all');
      cats.forEach((cat) => {
        const el = document.getElementById(`style-category-${cat.id}`);
        if (el) observer!.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [isStyleModalOpen, observerCallback]);

  // Escapeキーでモーダルを閉じる + フォーカストラップ
  useEffect(() => {
    if (!isStyleModalOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // 初期フォーカスを検索入力に移動
    const searchInput = modal.querySelector('input[type="text"]') as HTMLElement;
    searchInput?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeStyleModal();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = modal.querySelectorAll(focusableSelector);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStyleModalOpen, closeStyleModal]);

  if (!isStyleModalOpen) return null;

  const handleConfirm = () => {
    closeStyleModal();

    // 準備完了セクションへ自動スクロール（モーダルが閉じた後）
    setTimeout(() => {
      document.getElementById('generate-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 300);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    document.getElementById(`style-category-${categoryId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        role="presentation"
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={closeStyleModal}
        aria-hidden="true"
      />

      {/* モーダル */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        className="fixed inset-0 sm:inset-4 md:inset-6 lg:inset-10 bg-background rounded-none sm:rounded-3xl z-50 flex flex-col overflow-hidden animate-slideUp shadow-2xl"
      >
        {/* ヘッダー */}
        <header className="px-4 py-2.5 sm:px-6 sm:py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div>
              <div className="hidden sm:flex items-center gap-2 mb-1">
                <span className="w-6 h-px bg-secondary" />
                <span className="text-xs text-secondary tracking-[0.2em] font-medium">
                  SELECT STYLE
                </span>
              </div>
              <h2
                id="style-modal-title"
                className="font-serif text-lg sm:text-2xl font-semibold text-foreground"
              >
                スタイルを選んでください
              </h2>
            </div>
            <button
              onClick={closeStyleModal}
              className="p-2 sm:p-4 min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] rounded-xl hover:bg-card-hover transition-colors group cursor-pointer flex items-center justify-center"
              aria-label="モーダルを閉じる"
            >
              <X className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
            </button>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="スタイルを検索..."
              value={styleFilterState.searchQuery}
              onChange={(e) => setStyleSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2 min-h-[40px] sm:py-3.5 sm:min-h-[48px] rounded-xl
                bg-white/80 backdrop-blur-sm
                border border-border/50
                focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                outline-none transition-all text-sm
                placeholder:text-muted
              "
            />
          </div>

          {/* カテゴリナビ（アクティブ状態＋カウント付き） */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 mt-2 sm:mt-3 scrollbar-thin scrollbar-thumb-muted/20 -mx-1 px-1">
            {styleCategories.filter(c => c.id !== 'all').map((category) => {
              const isActive = activeCategory === category.id;
              const count = styleCounts[category.id] || 0;
              const CatIcon = iconMap[category.icon] || Grid3X3;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 min-h-0 rounded-full text-xs sm:px-5 sm:py-3 sm:min-h-[48px] sm:text-sm font-medium transition-all whitespace-nowrap
                    border cursor-pointer flex items-center gap-1.5 sm:gap-2
                    ${isActive
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-border/50 bg-white/60 text-muted hover:text-foreground hover:border-primary/30'
                    }
                  `}
                >
                  <CatIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? '' : 'text-muted'}`} />
                  {category.name}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-muted/10'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* メインコンテンツ（カテゴリ別カルーセル） */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 space-y-4 sm:space-y-6">
          {stylesByCategory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 min-h-[300px]">
              <div className="text-center animate-fadeIn">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted" />
                </div>
                <p className="text-muted font-medium mb-1">
                  スタイルが見つかりません
                </p>
                <p className="text-sm text-muted/70">
                  検索条件を変更してお試しください
                </p>
              </div>
            </div>
          ) : (
            stylesByCategory.map(({ category, styles }) => (
              <StyleCategoryCarousel
                key={category.id}
                category={category}
                styles={styles}
                selectedStyle={selectedStyle}
                onStyleSelect={setSelectedStyle}
              />
            ))
          )}
        </main>

        {/* フッター */}
        <footer className="px-4 py-3 sm:px-6 sm:py-5 border-t border-border bg-card/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {selectedStyle && getStyleThumbnail(selectedStyle, selectedCategory) && (
              <img src={getStyleThumbnail(selectedStyle, selectedCategory)} alt="" className="hidden sm:block w-10 h-10 rounded-lg object-cover border border-border/50" />
            )}
            <p className="text-xs sm:text-sm text-muted truncate">
              {selectedStyle ? (
                <>
                  選択中:{' '}
                  <span className="font-medium text-foreground">
                    {selectedStyle.name}
                  </span>
                </>
              ) : (
                'スタイルを選択してください'
              )}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <StyledButton variant="ghost" onClick={closeStyleModal}>
              キャンセル
            </StyledButton>
            <StyledButton onClick={handleConfirm} disabled={!selectedStyle}>
              <Check className="w-4 h-4" />
              スタイルを確定
            </StyledButton>
          </div>
        </footer>
      </div>
    </>
  );
}
