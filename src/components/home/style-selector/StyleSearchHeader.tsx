import { memo, useCallback, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface StyleSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
}

export const StyleSearchHeader = memo(function StyleSearchHeader({
  searchQuery,
  onSearchChange,
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

      {/* 結果数 */}
      <div className="flex items-center justify-end">
        <span className="text-sm text-muted">
          {resultCount}件のスタイル
        </span>
      </div>
    </div>
  );
});
