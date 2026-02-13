import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onChange?: (query: string) => void;
  className?: string;
  variant?: 'default' | 'compact';
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = '検索...',
  onSearch,
  onChange,
  className = '',
  variant = 'default',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query.trim());
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (onChange) {
      onChange(value);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onChange) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  // Compact variant for mobile header
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 text-muted hover:text-primary transition-colors"
            aria-label="検索を開く"
          >
            <Search className="w-5 h-5" />
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center bg-card border border-border rounded-full shadow-lg animate-in slide-in-from-right-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              className="w-48 px-4 py-2 bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none text-sm"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-muted hover:text-foreground"
                aria-label="クリア"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="p-2 text-primary hover:text-primary-hover"
              aria-label="検索"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setQuery('');
              }}
              className="p-2 text-muted hover:text-foreground"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors"
            aria-label="クリア"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
