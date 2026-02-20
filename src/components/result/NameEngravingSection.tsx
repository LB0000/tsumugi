import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, Type, Palette, MapPin, AlertCircle } from 'lucide-react';
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
  /** 処理中フラグ（Labor Illusion用） */
  isProcessing?: boolean;
  /** 処理ステージ（Labor Illusion用） */
  processingStage?: string | null;
  /** 親で計算済みのオーバーレイ画像URL（Canvas二重実行防止） */
  precomputedImageUrl?: string;
  /** 親で発生したエラー */
  overlayError?: string | null;
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
  isProcessing = false,
  processingStage = null,
  precomputedImageUrl,
  overlayError,
}: NameEngravingSectionProps) {
  const [activeTab, setActiveTab] = useState<CustomizeTab>('font');
  const shouldReduceMotion = useReducedMotion();

  const hasName = portraitName.trim() !== '';

  // カスタマイズ進捗計算
  const progress = {
    name: hasName,
    font: overlaySettings.fontId !== null,
    decoration: overlaySettings.decorationId !== null,
    position: overlaySettings.position !== 'bottom-center',
  };
  const completionRate = Object.values(progress).filter(Boolean).length;
  const totalSteps = 4;

  // キーボードナビゲーション
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS.length;
      setActiveTab(TABS[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[prevIndex].id);
    }
  };

  return (
    <div className="bg-white border-2 border-zinc-200 rounded-lg p-6 md:p-10 space-y-6 md:space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
            animate={shouldReduceMotion ? {} : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#EC4899] text-white flex-shrink-0"
          >
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.div>
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#18181B] tracking-tight" style={{ fontFamily: 'Poiret One, serif' }}>
              名前を入れて特別な1枚に
            </h3>
            <p className="text-sm md:text-base text-[#71717A] mt-1" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
              無料で名前を追加できます
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 進捗インジケーター */}
          {hasName && (
            <div className="flex items-center gap-2 text-xs text-[#71717A]" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
              <span className="hidden sm:inline">進捗</span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={shouldReduceMotion ? {} : { scale: 0 }}
                    animate={shouldReduceMotion ? {} : { scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                      i < completionRate ? 'bg-[#EC4899]' : 'bg-zinc-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium text-[#18181B]">
                {completionRate}/{totalSteps}
              </span>
            </div>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EC4899]/10 text-[#EC4899]" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
            NEW
          </span>
        </div>
      </div>

      {/* 名前入力フィールド */}
      <div className="bg-white rounded-xl p-5 border-2 border-zinc-200">
        <NameInputField
          value={portraitName}
          onChange={onNameChange}
          label="名前を入力（任意・無料）"
          placeholder="例: ポチ、太郎、花子"
          isProcessing={isProcessing}
          processingStage={processingStage}
        />
      </div>

      {/* 未入力時の促し（Zeigarnik Effect） */}
      {!hasName && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-900" style={{ fontFamily: 'Poiret One, serif' }}>
              名前を追加すると、より特別な贈り物になります
            </p>
            <p className="text-xs text-yellow-700 mt-1" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
              無料で追加できます（後から変更も可能）
            </p>
          </div>
        </motion.div>
      )}

      {/* インラインプレビュー（名前入力時に常時表示） */}
      <AnimatePresence>
        {hasName && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-6 border-2 border-[#EC4899] shadow-xl"
          >
            {/* LIVEバッジ */}
            <div className="absolute -top-3 -right-3 bg-[#EC4899] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>

            <PortraitPreview
              baseImageUrl={baseImageUrl}
              styleId={styleId}
              portraitName={portraitName}
              overlaySettings={overlaySettings}
              precomputedImageUrl={precomputedImageUrl}
              precomputedIsProcessing={isProcessing}
              precomputedError={overlayError}
              alt="名前入り肖像画プレビュー"
              className="max-w-md mx-auto rounded-lg shadow-2xl"
            />

            <p className="text-xs text-[#71717A] text-center mt-4" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
              実際の商品もこのように名前が表示されます
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* カスタマイズセクション - iOSボトムタブバースタイル（名前入力時のみ表示） */}
      <AnimatePresence>
        {hasName && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border-2 border-zinc-200 overflow-hidden"
          >
            {/* タブコンテンツ（上部） */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {activeTab === 'font' && (
                  <motion.div
                    key="font"
                    role="tabpanel"
                    id="panel-font"
                    aria-labelledby="tab-font"
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <FontPicker
                      selectedFontId={overlaySettings.fontId}
                      onSelect={(fontId) => onSettingsChange({ ...overlaySettings, fontId })}
                      styleId={styleId}
                    />
                  </motion.div>
                )}

                {activeTab === 'decoration' && (
                  <motion.div
                    key="decoration"
                    role="tabpanel"
                    id="panel-decoration"
                    aria-labelledby="tab-decoration"
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DecorationPicker
                      selectedDecorationId={overlaySettings.decorationId}
                      onSelect={(decorationId) => onSettingsChange({ ...overlaySettings, decorationId })}
                      styleId={styleId}
                    />
                  </motion.div>
                )}

                {activeTab === 'position' && (
                  <motion.div
                    key="position"
                    role="tabpanel"
                    id="panel-position"
                    aria-labelledby="tab-position"
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PositionPicker
                      selectedPosition={overlaySettings.position}
                      onSelect={(position) => onSettingsChange({ ...overlaySettings, position })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* iOS風ボトムタブバー */}
            <div
              className="border-t border-zinc-200 bg-zinc-50/80 backdrop-blur-sm"
              role="tablist"
              aria-label="カスタマイズオプション"
            >
              <div className="flex items-stretch">
                {TABS.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(e) => handleTabKeyDown(e, index)}
                      className={`
                        relative flex-1 flex flex-col items-center justify-center
                        gap-1 py-3 min-h-[56px] cursor-pointer
                        transition-colors duration-200
                        ${isActive
                          ? 'text-[#EC4899]'
                          : 'text-[#A1A1AA] hover:text-[#71717A]'
                        }
                      `}
                      style={{ fontFamily: 'Didact Gothic, sans-serif' }}
                    >
                      {/* アクティブインジケーター（上部ライン） */}
                      {isActive && (
                        <motion.div
                          layoutId="bottomTabIndicator"
                          className="absolute top-0 left-3 right-3 h-0.5 bg-[#EC4899] rounded-full"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                      <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                      <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 注意事項 */}
      <div className="text-xs md:text-sm text-[#71717A] space-y-1.5 bg-zinc-50 rounded-lg p-4" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
        <p>• 名前は最大20文字まで入力できます</p>
        <p>• 日本語・英語の文字、数字、スペース、ハイフンが使用できます</p>
        <p className="text-[#EC4899] font-medium">• 名前は無料で追加できます（料金は変わりません）</p>
      </div>
    </div>
  );
}
