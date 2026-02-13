import { memo } from 'react';
import { StyleCard } from './StyleCard';
import type { ArtStyle } from '../../../types';

interface StyleGridProps {
  styles: ArtStyle[];
  selectedStyle: ArtStyle | null;
  onStyleSelect: (style: ArtStyle) => void;
}

export const StyleGrid = memo(function StyleGrid({
  styles,
  selectedStyle,
  onStyleSelect
}: StyleGridProps) {
  if (styles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-muted font-medium mb-1">
            スタイルが見つかりません
          </p>
          <p className="text-sm text-muted/70">
            検索条件を変更してお試しください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-1">
      {styles.map((style, index) => (
        <StyleCard
          key={style.id}
          style={style}
          isSelected={selectedStyle?.id === style.id}
          onSelect={onStyleSelect}
          index={index}
        />
      ))}
    </div>
  );
});
