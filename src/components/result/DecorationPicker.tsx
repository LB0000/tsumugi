import { useCallback, useRef } from 'react';
import { Check } from 'lucide-react';
import { decorationPresets } from '../../data/decorationPresets';
import { getPortraitFont } from '../../data/portraitFonts';

interface DecorationPickerProps {
  selectedDecorationId: string | null;
  onSelect: (decorationId: string | null) => void;
  styleId: string;
}

function getContrastTextColor(hex: string): string {
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#333333' : '#FFFFFF';
}

type DecorationOption = { id: string | null; displayName: string; color: string };

export function DecorationPicker({ selectedDecorationId, onSelect, styleId }: DecorationPickerProps) {
  const styleFontConfig = getPortraitFont(styleId);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allOptions: DecorationOption[] = [
    { id: null, displayName: '推奨', color: styleFontConfig.color },
    ...decorationPresets,
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % allOptions.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + allOptions.length) % allOptions.length;
    }
    if (nextIndex !== null) {
      onSelect(allOptions[nextIndex].id);
      buttonRefs.current[nextIndex]?.focus();
    }
  }, [onSelect, allOptions.length]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center" role="radiogroup" aria-label="カラー選択">
      {allOptions.map((option, index) => {
        const isSelected = selectedDecorationId === option.id;
        return (
          <button
            key={option.id ?? '_recommended'}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.displayName}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-full"
          >
            <div
              className={`
                w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all
                ${isSelected
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-border group-hover:border-muted'
                }
              `}
              style={{ backgroundColor: option.color }}
            >
              {isSelected && (
                <Check className="w-4 h-4 drop-shadow-md" aria-hidden="true" style={{
                  color: getContrastTextColor(option.color),
                }} />
              )}
            </div>
            <span className="text-[10px] text-muted">{option.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
