import { useMemo } from 'react';
import { X, Check, Search } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { artStyles } from '../../data/artStyles';
import { styleCategories } from '../../data/styleCategories';
import { StyledButton } from '../common/StyledButton';
import { StyleCategoryCarousel } from './style-selector/StyleCategoryCarousel';

export function StyleModal() {
  const {
    isStyleModalOpen,
    closeStyleModal,
    selectedStyle,
    setSelectedStyle,
    styleFilterState,
    setStyleSearchQuery,
    setStyleTierFilter
  } = useAppStore();

  // フィルタリング
  const filteredStyles = useMemo(() => {
    return artStyles.filter((style) => {
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

      // Tier フィルター
      if (
        styleFilterState.selectedTier !== 'all' &&
        style.tier !== styleFilterState.selectedTier
      ) {
        return false;
      }

      return true;
    });
  }, [styleFilterState]);

  // カテゴリごとにスタイルをグループ化
  const stylesByCategory = useMemo(() => {
    const categories = styleCategories.filter(c => c.id !== 'all');
    return categories.map(category => ({
      category,
      styles: filteredStyles.filter(style => style.category === category.id)
    })).filter(group => group.styles.length > 0);
  }, [filteredStyles]);

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

  const tierOptions = [
    { key: 'all' as const, label: 'すべて' },
    { key: 'free' as const, label: '無料' },
    { key: 'starter' as const, label: 'スターター' },
    { key: 'studio' as const, label: 'スタジオ' }
  ];

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        className="fixed inset-4 md:inset-6 lg:inset-10 bg-background rounded-3xl z-50 flex flex-col overflow-hidden animate-slideUp shadow-2xl"
      >
        {/* ヘッダー */}
        <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-px bg-secondary" />
                <span className="text-xs text-secondary tracking-[0.2em] font-medium">
                  SELECT STYLE
                </span>
              </div>
              <h2
                id="style-modal-title"
                className="font-serif text-2xl font-semibold text-foreground"
              >
                スタイルを選んでください
              </h2>
            </div>
            <button
              onClick={closeStyleModal}
              className="p-2.5 rounded-xl hover:bg-card-hover transition-colors group cursor-pointer"
              aria-label="モーダルを閉じる"
            >
              <X className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
            </button>
          </div>

          {/* 検索・フィルター */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 検索バー */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="スタイルを検索..."
                value={styleFilterState.searchQuery}
                onChange={(e) => setStyleSearchQuery(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-2.5 rounded-xl
                  bg-white/80 backdrop-blur-sm
                  border border-border/50
                  focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                  outline-none transition-all text-sm
                  placeholder:text-muted
                "
              />
            </div>

            {/* Tier フィルター */}
            <div className="flex gap-1.5">
              {tierOptions.map((tier) => (
                <button
                  key={tier.key}
                  onClick={() => setStyleTierFilter(tier.key)}
                  className={`
                    px-3 py-2 rounded-lg text-xs font-medium
                    transition-all duration-200 cursor-pointer whitespace-nowrap
                    ${styleFilterState.selectedTier === tier.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white/60 border border-border/50 text-muted hover:text-foreground hover:border-primary/30'
                    }
                  `}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* メインコンテンツ（カテゴリ別カルーセル） */}
        <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
        <footer className="px-6 py-4 border-t border-border bg-card/50 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-muted">
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
          <div className="flex gap-3">
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
