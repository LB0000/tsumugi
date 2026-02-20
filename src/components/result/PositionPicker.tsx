import { useCallback, useRef } from 'react';
import type { TextPosition } from '../../types/textOverlay';

const POSITIONS: {
  id: TextPosition;
  label: string;
  alignItems: string;
  justifyContent: string;
}[] = [
  { id: 'top-left', label: '左上', alignItems: 'items-start', justifyContent: 'justify-start' },
  { id: 'top-center', label: '上中央', alignItems: 'items-start', justifyContent: 'justify-center' },
  { id: 'top-right', label: '右上', alignItems: 'items-start', justifyContent: 'justify-end' },
  { id: 'bottom-left', label: '左下', alignItems: 'items-end', justifyContent: 'justify-start' },
  { id: 'bottom-center', label: '下中央', alignItems: 'items-end', justifyContent: 'justify-center' },
  { id: 'bottom-right', label: '右下', alignItems: 'items-end', justifyContent: 'justify-end' },
];

// Arrow navigation assumes POSITIONS.length is evenly divisible by COLS
const COLS = 3;

interface PositionPickerProps {
  selectedPosition: TextPosition;
  onSelect: (position: TextPosition) => void;
}

export function PositionPicker({ selectedPosition, onSelect }: PositionPickerProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % POSITIONS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + POSITIONS.length) % POSITIONS.length;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + COLS) % POSITIONS.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - COLS + POSITIONS.length) % POSITIONS.length;
    }

    if (nextIndex !== null) {
      onSelect(POSITIONS[nextIndex].id);
      buttonRefs.current[nextIndex]?.focus();
    }
  }, [onSelect]);

  return (
    <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto" role="radiogroup" aria-label="テキスト位置">
      {POSITIONS.map((pos, index) => {
        const isSelected = selectedPosition === pos.id;
        return (
          <button
            key={pos.id}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={pos.label}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(pos.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="flex flex-col items-center gap-1.5 cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-xl"
          >
            {/* ミニフレーム: テキスト位置を視覚的に表現 */}
            <div
              className={`
                relative w-full aspect-square rounded-xl border-2 p-3
                flex ${pos.alignItems} ${pos.justifyContent}
                transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-muted hover:bg-card-hover'
                }
              `}
            >
              {/* テキスト位置を示す横線 */}
              <div className="flex flex-col gap-1">
                <div
                  className={`h-1 w-8 rounded-full transition-colors ${
                    isSelected ? 'bg-primary' : 'bg-border group-hover:bg-muted'
                  }`}
                />
                <div
                  className={`h-0.5 w-5 rounded-full transition-colors ${
                    isSelected ? 'bg-primary/60' : 'bg-border/60 group-hover:bg-border'
                  }`}
                />
              </div>
            </div>

            {/* ラベル */}
            <span
              className={`text-xs transition-colors ${
                isSelected ? 'text-primary font-medium' : 'text-muted'
              }`}
            >
              {pos.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
