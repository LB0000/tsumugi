import { Check } from 'lucide-react';
import { selectableFonts } from '../../data/selectableFonts';
import { getPortraitFont } from '../../data/portraitFonts';

interface FontPickerProps {
  selectedFontId: string | null;
  onSelect: (fontId: string | null) => void;
  styleId: string;
}

export function FontPicker({ selectedFontId, onSelect, styleId }: FontPickerProps) {
  const styleFontConfig = getPortraitFont(styleId);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center" role="radiogroup" aria-label="フォント選択">
      {/* スタイル推奨オプション */}
      <button
        type="button"
        role="radio"
        aria-checked={selectedFontId === null}
        aria-label="推奨"
        onClick={() => onSelect(null)}
        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
      >
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center transition-all
            ${selectedFontId === null
              ? 'bg-[#EC4899] text-white ring-2 ring-[#EC4899]/30 scale-110'
              : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
            }
          `}
        >
          {selectedFontId === null ? (
            <Check className="w-5 h-5" aria-hidden="true" />
          ) : (
            <span
              className="text-sm leading-none"
              style={{ fontFamily: `"${styleFontConfig.fontFamily}", sans-serif` }}
            >
              Aa
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 max-w-[48px] text-center truncate">推奨</span>
      </button>

      {/* 選択可能フォント */}
      {selectableFonts.map((font) => {
        const isSelected = selectedFontId === font.id;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={font.displayName}
            onClick={() => onSelect(font.id)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div
              className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all
                ${isSelected
                  ? 'bg-[#EC4899] text-white ring-2 ring-[#EC4899]/30 scale-110'
                  : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
                }
              `}
            >
              {isSelected ? (
                <Check className="w-5 h-5" aria-hidden="true" />
              ) : (
                <span
                  className="text-sm leading-none"
                  style={{
                    fontFamily: `"${font.fontFamily}", sans-serif`,
                    fontWeight: font.fontWeight,
                  }}
                >
                  Aa
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 max-w-[48px] text-center truncate">
              {font.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
