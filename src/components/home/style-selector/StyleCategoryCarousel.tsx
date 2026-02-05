import { memo } from 'react';
import { StyleCard } from './StyleCard';
import type { ArtStyle, StyleCategory } from '../../../types';

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

  return (
    <section>
      {/* カテゴリヘッダー */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="font-serif font-semibold text-foreground text-lg">
          {category.name}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/10 text-muted">
          {styles.length}
        </span>
      </div>

      {/* グリッドで均等配置（最大幅制限付き） */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${styles.length}, minmax(140px, ${styles.length <= 2 ? '200px' : '1fr'}))`
        }}
      >
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
