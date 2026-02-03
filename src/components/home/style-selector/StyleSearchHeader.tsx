import { memo, useCallback, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { StyleFilterState } from '../../../types';

interface StyleSearchHeaderProps {
  searchQuery: string;
  selectedTier: StyleFilterState['selectedTier'];
  onSearchChange: (query: string) => void;
  onTierChange: (tier: StyleFilterState['selectedTier']) => void;
  resultCount: number;
}

const tierOptions: { key: StyleFilterState['selectedTier']; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'free', label: '無料' },
  { key: 'starter', label: 'スターター' },
  { key: 'studio', label: 'スタジオ' }
];

export const StyleSearchHeader = memo(function StyleSearchHeader({
  searchQuery,
  selectedTier,
  onSearchChange,
  onTierChange,
  resultCount
}: StyleSearchHeaderProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange(localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, onSearchChange]);

  const handleClearSearch = useCallback(() => {
    setLocalQuery('');
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="スタイルを検索..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="
            w-full pl-11 pr-10 py-3 rounded-xl
            bg-white/80 backdrop-blur-sm
            border border-border/50
            focus:border-primary/50 focus:ring-2 focus:ring-primary/20
            outline-none transition-all text-sm
            placeholder:text-muted
          "
        />
        {localQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/10 transition-colors"
            aria-label="検索をクリア"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {/* Tier フィルター + 結果数 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tierOptions.map((tier) => (
            <button
              key={tier.key}
              onClick={() => onTierChange(tier.key)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium
                transition-all duration-300 cursor-pointer
                ${selectedTier === tier.key
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white/60 backdrop-blur-sm border border-border/50 text-muted hover:text-foreground hover:border-primary/30'
                }
              `}
            >
              {tier.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-muted">
          {resultCount}件のスタイル
        </span>
      </div>
    </div>
  );
});
