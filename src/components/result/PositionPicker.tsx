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

interface PositionPickerProps {
  selectedPosition: TextPosition;
  onSelect: (position: TextPosition) => void;
}

export function PositionPicker({ selectedPosition, onSelect }: PositionPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto" role="radiogroup" aria-label="テキスト位置">
      {POSITIONS.map((pos) => {
        const isSelected = selectedPosition === pos.id;
        return (
          <button
            key={pos.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={pos.label}
            onClick={() => onSelect(pos.id)}
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
          >
            {/* ミニフレーム: テキスト位置を視覚的に表現 */}
            <div
              className={`
                relative w-full aspect-square rounded-xl border-2 p-3
                flex ${pos.alignItems} ${pos.justifyContent}
                transition-all duration-200
                ${isSelected
                  ? 'border-[#EC4899] bg-[#EC4899]/5 shadow-sm'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                }
              `}
            >
              {/* テキスト位置を示す横線 */}
              <div className="flex flex-col gap-1">
                <div
                  className={`h-1 w-8 rounded-full transition-colors ${
                    isSelected ? 'bg-[#EC4899]' : 'bg-zinc-300 group-hover:bg-zinc-400'
                  }`}
                />
                <div
                  className={`h-0.5 w-5 rounded-full transition-colors ${
                    isSelected ? 'bg-[#EC4899]/60' : 'bg-zinc-200 group-hover:bg-zinc-300'
                  }`}
                />
              </div>
            </div>

            {/* ラベル */}
            <span
              className={`text-xs transition-colors ${
                isSelected ? 'text-[#EC4899] font-medium' : 'text-zinc-500'
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
