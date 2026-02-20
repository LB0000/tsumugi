import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, AlertCircle } from 'lucide-react';
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

const TABS: { id: CustomizeTab; label: string }[] = [
  { id: 'font', label: 'フォント' },
  { id: 'decoration', label: 'カラー' },
  { id: 'position', label: '位置' },
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
  const prevTabIndexRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab);

  const hasName = portraitName.trim() !== '';

  // パネルの可視性をIntersectionObserverで監視
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !hasName) {
      setIsPanelVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsPanelVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasName]);

  // カスタマイズ進捗計算
  const progress = {
    name: hasName,
    font: overlaySettings.fontId !== null,
    decoration: overlaySettings.decorationId !== null,
    position: overlaySettings.position !== 'bottom-center',
  };
  const completionRate = Object.values(progress).filter(Boolean).length;
  const totalSteps = 4;

  // タブ切替ハンドラー
  const switchTab = useCallback((tabId: CustomizeTab) => {
    prevTabIndexRef.current = activeTabIndex;
    setActiveTab(tabId);
  }, [activeTabIndex]);

  // キーボードナビゲーション
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS.length;
      switchTab(TABS[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS.length) % TABS.length;
      switchTab(TABS[prevIndex].id);
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

      {/* カスタマイズパネル - iOS Home Screen風（名前入力時のみ表示） */}
      <AnimatePresence>
        {hasName && (
          <motion.div
            ref={panelRef}
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden bg-zinc-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.15)]"
          >
            {/* ドラッグインジケーター */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/30" />
            </div>

            {/* ヘッダー */}
            <div className="text-center px-5 pb-3">
              <h4
                className="text-sm font-semibold text-white/90 tracking-wide"
                style={{ fontFamily: 'Poiret One, serif' }}
              >
                カスタマイズ
              </h4>
            </div>

            {/* コンテンツ */}
            <div className="px-5 py-4 min-h-[100px]">
              <AnimatePresence mode="wait">
                {activeTab === 'font' && (
                  <motion.div
                    key="font"
                    role="tabpanel"
                    id="panel-font"
                    aria-labelledby="tab-font"
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? 1 : -1) * 30 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? -1 : 1) * 30 }}
                    transition={{ duration: 0.2 }}
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
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? 1 : -1) * 30 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? -1 : 1) * 30 }}
                    transition={{ duration: 0.2 }}
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
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? 1 : -1) * 30 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, x: (activeTabIndex > prevTabIndexRef.current ? -1 : 1) * 30 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PositionPicker
                      selectedPosition={overlaySettings.position}
                      onSelect={(position) => onSettingsChange({ ...overlaySettings, position })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* セグメントコントロール用スペーサー（固定時にコンテンツが隠れないように） */}
            {isPanelVisible && <div className="h-[60px]" />}

            {/* iOS風セグメントコントロール（パネル非表示時はインライン） */}
            {!isPanelVisible && (
              <SegmentedControl
                tabs={TABS}
                activeTab={activeTab}
                activeTabIndex={activeTabIndex}
                onTabClick={switchTab}
                onKeyDown={handleTabKeyDown}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 固定フッター: セグメントコントロール（パネルが画面内の時だけ表示） */}
      <AnimatePresence>
        {hasName && isPanelVisible && (
          <motion.div
            initial={shouldReduceMotion ? {} : { y: 60, opacity: 0 }}
            animate={shouldReduceMotion ? {} : { y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? {} : { y: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/80 backdrop-blur-2xl border-t border-white/10"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <SegmentedControl
              tabs={TABS}
              activeTab={activeTab}
              activeTabIndex={activeTabIndex}
              onTabClick={switchTab}
              onKeyDown={handleTabKeyDown}
              pillLayoutId="segmentedPillFixed"
            />
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

/** iOS風セグメントコントロール */
function SegmentedControl({
  tabs,
  activeTab,
  activeTabIndex,
  onTabClick,
  onKeyDown,
  pillLayoutId = 'segmentedPill',
}: {
  tabs: readonly { id: CustomizeTab; label: string }[];
  activeTab: CustomizeTab;
  activeTabIndex: number;
  onTabClick: (tabId: CustomizeTab) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  pillLayoutId?: string;
}) {
  return (
    <div className="px-5 py-2">
      <div
        className="relative flex items-center p-1 rounded-full bg-white/10"
        role="tablist"
        aria-label="カスタマイズオプション"
      >
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-white/90 shadow-sm"
          layoutId={pillLayoutId}
          style={{
            width: `calc(${100 / tabs.length}% - 4px)`,
            left: `calc(${(activeTabIndex * 100) / tabs.length}% + 2px)`,
          }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
        {tabs.map((tab, index) => {
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
              onClick={() => onTabClick(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`
                relative z-10 flex-1 py-2 min-h-[36px]
                text-xs font-semibold text-center rounded-full
                cursor-pointer transition-colors duration-200
                ${isActive
                  ? 'text-zinc-900'
                  : 'text-white/60 hover:text-white/80'
                }
              `}
              style={{ fontFamily: 'Didact Gothic, sans-serif' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
