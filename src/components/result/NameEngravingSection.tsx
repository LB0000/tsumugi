import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
  const shouldReduceMotion = useReducedMotion();

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab);

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

  // タブ切替ハンドラー
  const switchTab = useCallback((tabId: CustomizeTab) => {
    prevTabIndexRef.current = activeTabIndex;
    setActiveTab(tabId);
  }, [activeTabIndex]);

  // キーボードナビゲーション（WAI-ARIA Tabs: Arrow keyでフォーカス移動）
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (index + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (index - 1 + TABS.length) % TABS.length;
    }
    if (newIndex !== null) {
      switchTab(TABS[newIndex].id);
      document.getElementById(`tab-${TABS[newIndex].id}`)?.focus();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 md:p-10 space-y-6 md:space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-secondary to-primary text-white flex-shrink-0">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-foreground tracking-wide">
              名前を入れて特別な1枚に
            </h3>
            <p className="text-sm md:text-base text-muted mt-1">
              無料で名前を追加できます
            </p>
          </div>
        </div>
        {/* 進捗インジケーター */}
        {hasName && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">進捗</span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    i < completionRate ? 'bg-secondary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <span className="font-medium text-foreground">
              {completionRate}/{totalSteps}
            </span>
          </div>
        )}
      </div>

      {/* 名前入力フィールド */}
      <div>
        <NameInputField
          value={portraitName}
          onChange={onNameChange}
          label="名前を入力（任意・無料）"
          placeholder="例: ポチ、太郎、花子"
          isProcessing={isProcessing}
          processingStage={processingStage}
        />
      </div>

      {/* 未入力時の促し */}
      {!hasName && (
        <div className="bg-card-hover border border-border rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              名前を追加すると、より特別な贈り物になります
            </p>
            <p className="text-xs text-muted mt-1">
              無料で追加できます（後から変更も可能）
            </p>
          </div>
        </div>
      )}

      {/* インラインプレビュー（名前入力時に常時表示） */}
      <AnimatePresence>
        {hasName && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.3 }}
            // sticky offset = Announcement Bar (~28px) + Main Header (56px) + Category Nav (~36px)
            className="sticky top-[120px] z-10 md:static"
          >
            <div className="relative bg-card-hover rounded-lg p-4 md:p-6 border border-primary/30 shadow-md">
              {/* プレビューラベル */}
              <div className="absolute -top-2.5 left-4 z-20 bg-card text-muted text-xs font-medium px-2.5 py-0.5 rounded border border-border">
                プレビュー
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
                className="max-w-md mx-auto rounded-lg shadow-2xl [&>img]:max-h-[38vh] [&>img]:w-auto [&>img]:mx-auto md:[&>img]:max-h-none"
              />

              <p className="text-xs text-muted text-center mt-3 md:mt-4">
                実際の商品もこのように名前が表示されます
              </p>

              {/* Sticky時の下端シャドウ（モバイルのみ） */}
              <div className="absolute -bottom-2 left-2 right-2 h-4 bg-gradient-to-b from-card-hover/80 to-transparent pointer-events-none md:hidden blur-sm" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* カスタマイズパネル - iOS Home Screen風（名前入力時のみ表示） */}
      <AnimatePresence>
        {hasName && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-card-hover border border-border"
          >
            {/* ヘッダー */}
            <div className="text-center px-5 pt-4 pb-2">
              <h4 className="font-serif text-sm font-semibold text-foreground tracking-wide">
                カスタマイズ
              </h4>
            </div>

            {/* iOS風セグメントコントロール（パネル上部） */}
            <SegmentedControl
              tabs={TABS}
              activeTab={activeTab}
              activeTabIndex={activeTabIndex}
              onTabClick={switchTab}
              onKeyDown={handleTabKeyDown}
            />

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
          </motion.div>
        )}
      </AnimatePresence>

      {/* 注意事項 */}
      <div className="text-xs md:text-sm text-muted space-y-1.5 bg-card-hover rounded-lg p-4">
        <p>• 名前は最大20文字まで入力できます</p>
        <p>• 日本語・英語の文字、数字、スペース、ハイフンが使用できます</p>
        <p className="text-primary font-medium">• 名前は無料で追加できます（料金は変わりません）</p>
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
        className="relative flex items-center p-1 rounded-full bg-border/60"
        role="tablist"
        aria-label="カスタマイズオプション"
      >
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-card shadow-sm"
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
                focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1
                ${isActive
                  ? 'text-foreground'
                  : 'text-muted hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
