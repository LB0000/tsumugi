import { useState } from 'react';
import { Check } from 'lucide-react';
import { selectableFonts } from '../../data/selectableFonts';
import { getPortraitFont } from '../../data/portraitFonts';
import type { FontCategory } from '../../types/textOverlay';

const CATEGORIES: { id: FontCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'elegant', label: 'エレガント' },
  { id: 'classic', label: 'クラシック' },
  { id: 'pop', label: 'ポップ' },
  { id: 'handwritten', label: '手書き' },
  { id: 'japanese', label: '和文' },
];

interface FontPickerProps {
  selectedFontId: string | null;
  onSelect: (fontId: string | null) => void;
  styleId: string;
}

export function FontPicker({ selectedFontId, onSelect, styleId }: FontPickerProps) {
  const [activeCategory, setActiveCategory] = useState<FontCategory | 'all'>('all');
  const styleFontConfig = getPortraitFont(styleId);

  const filteredFonts = activeCategory === 'all'
    ? selectableFonts
    : selectableFonts.filter((f) => f.category === activeCategory);

  return (
    <div className="space-y-3">
      {/* カテゴリタブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer
              ${activeCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* フォントリスト */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* スタイル推奨オプション */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`
            flex-shrink-0 w-32 p-3 rounded-xl border-2 transition-all cursor-pointer
            ${selectedFontId === null
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">推奨</span>
            {selectedFontId === null && <Check className="w-3.5 h-3.5 text-purple-600" />}
          </div>
          <p
            className="text-sm truncate text-gray-800"
            style={{ fontFamily: `"${styleFontConfig.fontFamily}", sans-serif` }}
          >
            サンプル
          </p>
          <p className="text-[10px] text-gray-500 mt-1 truncate">スタイルに合わせる</p>
        </button>

        {/* 選択可能フォント */}
        {filteredFonts.map((font) => (
          <button
            key={font.id}
            type="button"
            onClick={() => onSelect(font.id)}
            className={`
              flex-shrink-0 w-32 p-3 rounded-xl border-2 transition-all cursor-pointer
              ${selectedFontId === font.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500">{font.displayName}</span>
              {selectedFontId === font.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
            </div>
            <p
              className="text-sm truncate text-gray-800"
              style={{
                fontFamily: `"${font.fontFamily}", sans-serif`,
                fontWeight: font.fontWeight,
              }}
            >
              サンプル
            </p>
            <p
              className="text-[10px] text-gray-400 mt-1 truncate"
              style={{
                fontFamily: `"${font.fontFamily}", sans-serif`,
                fontWeight: font.fontWeight,
              }}
            >
              ABCあいう
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
