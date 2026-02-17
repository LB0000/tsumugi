import type { TextPosition } from '../../types/textOverlay';

const POSITIONS: { id: TextPosition; label: string; dotClass: string }[] = [
  { id: 'top-left', label: '左上', dotClass: 'top-1.5 left-1.5' },
  { id: 'top-center', label: '上中央', dotClass: 'top-1.5 left-1/2 -translate-x-1/2' },
  { id: 'top-right', label: '右上', dotClass: 'top-1.5 right-1.5' },
  { id: 'bottom-left', label: '左下', dotClass: 'bottom-1.5 left-1.5' },
  { id: 'bottom-center', label: '下中央', dotClass: 'bottom-1.5 left-1/2 -translate-x-1/2' },
  { id: 'bottom-right', label: '右下', dotClass: 'bottom-1.5 right-1.5' },
];

interface PositionPickerProps {
  selectedPosition: TextPosition;
  onSelect: (position: TextPosition) => void;
}

export function PositionPicker({ selectedPosition, onSelect }: PositionPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[240px]">
      {POSITIONS.map((pos) => (
        <button
          key={pos.id}
          type="button"
          onClick={() => onSelect(pos.id)}
          className={`
            relative aspect-[4/3] rounded-lg border-2 transition-all cursor-pointer
            ${selectedPosition === pos.id
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }
          `}
          title={pos.label}
        >
          {/* 画像エリア表現 */}
          <div className="absolute inset-1 rounded bg-gray-200/50" />

          {/* テキスト位置ドット */}
          <div className={`absolute ${pos.dotClass}`}>
            <div className={`
              w-2.5 h-2.5 rounded-full transition-colors
              ${selectedPosition === pos.id ? 'bg-purple-600' : 'bg-gray-400'}
            `} />
          </div>

          {/* テキスト位置の線（表現） */}
          <div className={`absolute ${pos.dotClass}`}>
            <div className={`
              h-[2px] w-6 rounded-full mt-3.5
              ${selectedPosition === pos.id ? 'bg-purple-400' : 'bg-gray-300'}
              ${pos.id.includes('right') ? '-translate-x-full ml-2.5' : pos.id.includes('center') ? '-translate-x-1/2' : ''}
            `} />
          </div>
        </button>
      ))}
    </div>
  );
}
