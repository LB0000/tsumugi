import { useState } from 'react';
import { Sparkles, Type, Palette, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { NameInputField } from './NameInputField';
import { PortraitPreview } from './PortraitPreview';
import { FontPicker } from './FontPicker';
import { DecorationPicker } from './DecorationPicker';
import { PositionPicker } from './PositionPicker';
import type { TextOverlaySettings } from '../../types/textOverlay';

export interface NameEngravingSectionProps {
  baseImageUrl: string;
  styleId: string;
  portraitName: string;
  onNameChange: (name: string) => void;
  overlaySettings: TextOverlaySettings;
  onSettingsChange: (settings: TextOverlaySettings) => void;
}

type CustomizeTab = 'font' | 'decoration' | 'position';

const TABS: { id: CustomizeTab; label: string; icon: typeof Type }[] = [
  { id: 'font', label: 'フォント', icon: Type },
  { id: 'decoration', label: 'カラー', icon: Palette },
  { id: 'position', label: '位置', icon: MapPin },
];

export function NameEngravingSection({
  baseImageUrl,
  styleId,
  portraitName,
  onNameChange,
  overlaySettings,
  onSettingsChange,
}: NameEngravingSectionProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomizeTab>('font');

  const hasName = portraitName.trim() !== '';

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 space-y-6 border border-purple-100">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900">
              名前を入れて特別な1枚に
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              無料で名前を追加できます
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          NEW
        </span>
      </div>

      {/* 名前入力フィールド */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <NameInputField
          value={portraitName}
          onChange={onNameChange}
          label="名前を入力（任意・無料）"
          placeholder="例: ポチ、太郎、花子"
        />
      </div>

      {/* インラインプレビュー（名前入力時に常時表示） */}
      {hasName && (
        <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            プレビュー
          </h4>
          <PortraitPreview
            baseImageUrl={baseImageUrl}
            styleId={styleId}
            portraitName={portraitName}
            overlaySettings={overlaySettings}
            alt="名前入り肖像画プレビュー"
            className="max-w-md mx-auto"
          />
          <p className="text-xs text-gray-500 text-center">
            実際の商品もこのように名前が表示されます
          </p>
        </div>
      )}

      {/* カスタマイズセクション（名前入力時のみ表示） */}
      {hasName && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* トグルヘッダー */}
          <button
            type="button"
            onClick={() => setShowCustomize(!showCustomize)}
            className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-800">カスタマイズ</span>
              <span className="text-xs text-gray-500">フォント・カラー・位置</span>
            </div>
            {showCustomize
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />
            }
          </button>

          {/* カスタマイズ内容 */}
          {showCustomize && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              {/* タブ */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer
                        ${activeTab === tab.id
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* タブコンテンツ */}
              {activeTab === 'font' && (
                <FontPicker
                  selectedFontId={overlaySettings.fontId}
                  onSelect={(fontId) => onSettingsChange({ ...overlaySettings, fontId })}
                  styleId={styleId}
                />
              )}

              {activeTab === 'decoration' && (
                <DecorationPicker
                  selectedDecorationId={overlaySettings.decorationId}
                  onSelect={(decorationId) => onSettingsChange({ ...overlaySettings, decorationId })}
                  styleId={styleId}
                />
              )}

              {activeTab === 'position' && (
                <PositionPicker
                  selectedPosition={overlaySettings.position}
                  onSelect={(position) => onSettingsChange({ ...overlaySettings, position })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 注意事項 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• 名前は最大20文字まで入力できます</p>
        <p>• 日本語・英語の文字、数字、スペース、ハイフンが使用できます</p>
        <p>• 名前は無料で追加できます（料金は変わりません）</p>
      </div>
    </div>
  );
}
