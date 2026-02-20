import { useCallback, useRef } from 'react';
import { Check } from 'lucide-react';
import { selectableFonts } from '../../data/selectableFonts';
import { getPortraitFont } from '../../data/portraitFonts';

interface FontPickerProps {
  selectedFontId: string | null;
  onSelect: (fontId: string | null) => void;
  styleId: string;
}

// null (推奨) + selectableFonts を1つの配列として扱う
type FontOption = { id: string | null; displayName: string; fontFamily: string; fontWeight?: string | number };

export function FontPicker({ selectedFontId, onSelect, styleId }: FontPickerProps) {
  const styleFontConfig = getPortraitFont(styleId);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allOptions: FontOption[] = [
    { id: null, displayName: '推奨', fontFamily: styleFontConfig.fontFamily },
    ...selectableFonts,
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
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center" role="radiogroup" aria-label="フォント選択">
      {allOptions.map((font, index) => {
        const isSelected = selectedFontId === font.id;
        return (
          <button
            key={font.id ?? '_recommended'}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={font.displayName}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(font.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-full"
          >
            <div
              className={`
                relative w-14 h-14 rounded-full flex items-center justify-center transition-all
                ${isSelected
                  ? 'bg-primary text-white ring-2 ring-primary/30 scale-110'
                  : 'bg-card-hover text-foreground group-hover:bg-border/40'
                }
              `}
            >
              <span
                className="text-sm leading-none"
                style={{
                  fontFamily: `"${font.fontFamily}", sans-serif`,
                  fontWeight: font.fontWeight,
                }}
              >
                Aa
              </span>
              {isSelected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-card">
                  <Check className="w-3 h-3 text-white" aria-hidden="true" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted max-w-[48px] text-center truncate">
              {font.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
