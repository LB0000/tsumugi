import { useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { artStyles } from '../../data/artStyles';
import { StyledButton } from '../common/StyledButton';
import {
  StyleGrid,
  StyleCategorySidebar,
  StyleSearchHeader
} from './style-selector';

export function StyleModal() {
  const {
    isStyleModalOpen,
    closeStyleModal,
    selectedStyle,
    setSelectedStyle,
    styleFilterState,
    setStyleSearchQuery,
    setStyleTierFilter,
    setStyleCategoryFilter
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

      // カテゴリフィルター
      if (
        styleFilterState.selectedCategory !== 'all' &&
        style.category !== styleFilterState.selectedCategory
      ) {
        return false;
      }

      return true;
    });
  }, [styleFilterState]);

  if (!isStyleModalOpen) return null;

  const handleConfirm = () => {
    closeStyleModal();
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        className="fixed inset-4 md:inset-6 lg:inset-10 bg-background rounded-3xl z-50 flex flex-col overflow-hidden animate-slideUp shadow-2xl"
      >
        {/* ヘッダー */}
        <header className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center justify-between">
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
        </header>

        {/* メインコンテンツ（2カラムレイアウト） */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* サイドバー（デスクトップ） */}
          <aside className="hidden lg:block w-56 border-r border-border bg-card/30 p-4 overflow-y-auto">
            <StyleCategorySidebar
              selectedCategory={styleFilterState.selectedCategory}
              onCategorySelect={setStyleCategoryFilter}
            />
          </aside>

          {/* メインエリア */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* 検索・フィルター */}
            <div className="px-6 py-4 border-b border-border/50 bg-card/20 flex-shrink-0">
              {/* モバイル用カテゴリ選択 */}
              <div className="lg:hidden mb-4">
                <StyleCategorySidebar
                  selectedCategory={styleFilterState.selectedCategory}
                  onCategorySelect={setStyleCategoryFilter}
                />
              </div>

              <StyleSearchHeader
                searchQuery={styleFilterState.searchQuery}
                selectedTier={styleFilterState.selectedTier}
                onSearchChange={setStyleSearchQuery}
                onTierChange={setStyleTierFilter}
                resultCount={filteredStyles.length}
              />
            </div>

            {/* スタイルグリッド */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-card/30 scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent">
              <StyleGrid
                styles={filteredStyles}
                selectedStyle={selectedStyle}
                onStyleSelect={setSelectedStyle}
              />
            </div>
          </main>
        </div>

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
