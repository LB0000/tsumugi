import { memo } from 'react';
import { Grid3X3, Crown, Leaf, Sparkles, Monitor } from 'lucide-react';
import { StyleCard } from './StyleCard';
import type { ArtStyle, StyleCategory } from '../../../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid3X3, Crown, Leaf, Sparkles, Monitor
};

interface StyleCategoryCarouselProps {
  category: StyleCategory;
  styles: ArtStyle[];
  selectedStyle: ArtStyle | null;
  onStyleSelect: (style: ArtStyle) => void;
}

export const StyleCategoryCarousel = memo(function StyleCategoryCarousel({
  category,
  styles,
  selectedStyle,
  onStyleSelect
}: StyleCategoryCarouselProps) {
  if (styles.length === 0) return null;

  const Icon = iconMap[category.icon] || Grid3X3;

  return (
    <section id={`style-category-${category.id}`}>
      {/* カテゴリヘッダー */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <Icon className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-serif font-semibold text-foreground text-lg">
            {category.name}
          </h3>
          <p className="text-xs text-muted mt-0.5">{category.description}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/10 text-muted ml-auto">
          {styles.length}
        </span>
      </div>

      {/* グリッドで均等配置 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {styles.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            isSelected={selectedStyle?.id === style.id}
            onSelect={onStyleSelect}
            compact
          />
        ))}
      </div>
    </section>
  );
});
