import { memo, useMemo } from 'react';
import { Grid3X3, Palette, Crown, Sparkles, Leaf, Layers } from 'lucide-react';
import { styleCategories } from '../../../data/styleCategories';
import { artStyles } from '../../../data/artStyles';
import type { StyleCategoryId } from '../../../types';

interface StyleCategorySidebarProps {
  selectedCategory: StyleCategoryId;
  onCategorySelect: (category: StyleCategoryId) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid3X3,
  Palette,
  Crown,
  Sparkles,
  Leaf,
  Layers
};

export const StyleCategorySidebar = memo(function StyleCategorySidebar({
  selectedCategory,
  onCategorySelect
}: StyleCategorySidebarProps) {
  // カテゴリごとのスタイル数を計算
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: artStyles.length };
    artStyles.forEach((style) => {
      counts[style.category] = (counts[style.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <nav
      aria-label="スタイルカテゴリー"
      className="w-full lg:w-56 flex-shrink-0"
    >
      <div className="lg:sticky lg:top-0">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-3">
          カテゴリ
        </h3>
        <ul role="listbox" aria-label="カテゴリー選択" className="space-y-1">
          {styleCategories.map((category, index) => {
            const Icon = iconMap[category.icon] || Grid3X3;
            const isActive = selectedCategory === category.id;
            const count = categoryCounts[category.id] || 0;

            return (
              <li key={category.id}>
                <button
                  role="option"
                  aria-selected={isActive}
                  onClick={() => onCategorySelect(category.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-left transition-all duration-300 cursor-pointer
                    animate-slideInFromLeft
                    ${isActive
                      ? 'sidebar-item-active bg-primary/5 text-foreground font-medium'
                      : 'text-muted hover:text-foreground hover:bg-card'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span className="flex-1 text-sm">{category.name}</span>
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/10 text-muted'
                      }
                    `}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
});
