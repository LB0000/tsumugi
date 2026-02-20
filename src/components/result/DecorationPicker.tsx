import { Check } from 'lucide-react';
import { decorationPresets } from '../../data/decorationPresets';
import { getPortraitFont } from '../../data/portraitFonts';

interface DecorationPickerProps {
  selectedDecorationId: string | null;
  onSelect: (decorationId: string | null) => void;
  styleId: string;
}

export function DecorationPicker({ selectedDecorationId, onSelect, styleId }: DecorationPickerProps) {
  const styleFontConfig = getPortraitFont(styleId);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center">
      {/* スタイル推奨オプション */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex flex-col items-center gap-1.5 cursor-pointer group"
      >
        <div
          className={`
            w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all
            ${selectedDecorationId === null
              ? 'border-[#EC4899] ring-2 ring-[#EC4899]/30 scale-110'
              : 'border-zinc-200 group-hover:border-zinc-400'
            }
          `}
          style={{
            backgroundColor: styleFontConfig.color,
          }}
        >
          {selectedDecorationId === null && <Check className="w-4 h-4 text-white drop-shadow-md" />}
        </div>
        <span className="text-[10px] text-zinc-500">推奨</span>
      </button>

      {/* プリセット */}
      {decorationPresets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          className="flex flex-col items-center gap-1.5 cursor-pointer group"
        >
          <div
            className={`
              w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all
              ${selectedDecorationId === preset.id
                ? 'border-[#EC4899] ring-2 ring-[#EC4899]/30 scale-110'
                : 'border-zinc-200 group-hover:border-zinc-400'
              }
            `}
            style={{ backgroundColor: preset.color }}
          >
            {selectedDecorationId === preset.id && (
              <Check className="w-4 h-4 drop-shadow-md" style={{
                color: preset.color === '#FFFFFF' || preset.color === '#FFD700' ? '#333' : '#fff',
              }} />
            )}
          </div>
          <span className="text-[10px] text-zinc-500">{preset.displayName}</span>
        </button>
      ))}
    </div>
  );
}
