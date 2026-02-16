import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Download, ShoppingCart, ArrowRight, Camera, Palette, Wand2, Frame, ScanFace, Paintbrush, Layers, Contrast, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateImage } from '../../api';
import { StyledButton } from '../common/StyledButton';
import { CircularProgress } from './CircularProgress';
import { StyleInfoPanel } from './StyleInfoPanel';
import { trackEvent } from '../../lib/analytics';

// 9段階マイクロステージ
const generationStages = [
  { icon: Camera, label: '写真を読み込んでいます', duration: 1000, progress: 8 },
  { icon: ScanFace, label: '顔と表情を分析中', duration: 1200, progress: 18 },
  { icon: Sparkles, label: 'スタイルを理解中', duration: 1500, progress: 30 },
  { icon: Palette, label: '色彩を調和中', duration: 1800, progress: 45 },
  { icon: Paintbrush, label: '筆致を再現中', duration: 1600, progress: 58 },
  { icon: Wand2, label: 'ディテールを描き込み中', duration: 1400, progress: 70 },
  { icon: Layers, label: 'テクスチャを重ねています', duration: 1200, progress: 82 },
  { icon: Contrast, label: '明暗を調整中', duration: 1000, progress: 92 },
  { icon: Frame, label: '最終仕上げ中', duration: 2300, progress: 98 },
];

function getEncouragingMessage(stage: number) {
  if (stage < 3) return '素敵に仕上げています...';
  if (stage < 6) return '細部まで丁寧に...';
  if (stage < 8) return 'もうすぐ完成です！';
  return '完成間近です！';
}

export function GeneratePreview() {
  const {
    uploadState,
    selectedStyle,
    selectedCategory,
    generatedImage,
    setGeneratedImage,
    setGallerySaved,
    resetUpload
  } = useAppStore();
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [currentInfoPanel, setCurrentInfoPanel] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const cancelledRef = useRef(false);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // ステージを段階的に進める（可変 duration）
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStage(0);
      setSmoothProgress(0);
      cancelledRef.current = true;
      return;
    }

    cancelledRef.current = false;
    timerIdsRef.current = [];

    const scheduleNext = (currentStage: number) => {
      if (currentStage >= generationStages.length - 1) return;

      const nextStage = currentStage + 1;
      const timeout = setTimeout(() => {
        if (cancelledRef.current) return;
        setGenerationStage(nextStage);
        scheduleNext(nextStage);
      }, generationStages[nextStage].duration);
      timerIdsRef.current.push(timeout);
    };

    const firstTimeout = setTimeout(() => {
      if (cancelledRef.current) return;
      setGenerationStage(1);
      scheduleNext(1);
    }, generationStages[0].duration);
    timerIdsRef.current.push(firstTimeout);

    return () => {
      cancelledRef.current = true;
      timerIdsRef.current.forEach(id => clearTimeout(id));
      timerIdsRef.current = [];
    };
  }, [isGenerating]);

  // 滑らかなプログレス補間（rAF で効率化: タブ非表示時は自動停止）
  useEffect(() => {
    if (!isGenerating) return;

    const targetProgress = generationStages[generationStage].progress;
    let rafId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      if (time - lastTime >= 50) {
        lastTime = time;
        setSmoothProgress(prev => {
          const diff = targetProgress - prev;
          if (Math.abs(diff) < 0.5) return targetProgress;
          return prev + diff * 0.08;
        });
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isGenerating, generationStage]);

  // インフォパネルのローテーション（3秒ごと）
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setCurrentInfoPanel(prev => prev + 1);
      setCurrentFact(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // アンマウント時に進行中のリクエストをキャンセル
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    if (!uploadState.previewUrl || !selectedStyle || !uploadState.rawFile) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError(null);
    setCurrentInfoPanel(0);
    setCurrentFact(0);

    try {
      const result = await generateImage({
        file: uploadState.rawFile,
        styleId: selectedStyle.id,
        category: selectedCategory
      }, controller.signal);

      setGeneratedImage(result.generatedImage);
      setGallerySaved(result.gallerySaved ?? null);
      trackEvent('image_generate');
      navigate('/result');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '画像の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleStartOver = () => {
    resetUpload();
  };

  const hasPhoto = uploadState.status === 'complete' && Boolean(uploadState.previewUrl);
  const canGenerate = hasPhoto && Boolean(selectedStyle) && Boolean(uploadState.rawFile);

  const progressColors: [string, string] = [
    selectedStyle?.colorPalette[0] || '#8B4513',
    selectedStyle?.colorPalette[1] || '#B8860B'
  ];

  return (
    <div className="animate-fadeInUp">
      {/* Generate Button */}
      {!generatedImage && (
        <div className="text-center">
          <div className="inline-flex flex-col items-center p-8 rounded-3xl glass-card max-w-lg w-full">
            {isGenerating ? (
              <div className="w-full space-y-6">
                {/* サークルプログレス + 写真 */}
                <CircularProgress
                  progress={smoothProgress}
                  colors={progressColors}
                >
                  <div className="relative">
                    <img
                      src={uploadState.previewUrl ?? ''}
                      alt="生成中"
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-background shadow-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 backdrop-blur-[2px]">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-white">
                        {Math.round(smoothProgress)}%
                      </span>
                    </div>
                  </div>
                </CircularProgress>

                {/* ステージ表示 */}
                <div className="flex items-center justify-between px-1" aria-live="polite">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-1 rounded-full border-2 border-primary/20 animate-stageIconSpin" />
                      {(() => {
                        const StageIcon = generationStages[generationStage].icon;
                        return <StageIcon className="w-6 h-6 text-primary relative" />;
                      })()}
                    </div>
                    <span
                      className="font-medium text-foreground text-sm sm:text-base animate-slideInFromLeft truncate"
                      key={generationStage}
                    >
                      {generationStages[generationStage].label}
                    </span>
                  </div>
                  <span
                    className="text-xs text-secondary shrink-0 ml-3 animate-fadeIn"
                    key={`msg-${generationStage}`}
                  >
                    {getEncouragingMessage(generationStage)}
                  </span>
                </div>

                {/* マイクロステージ ドットインジケーター */}
                <div className="flex justify-center gap-1">
                  {generationStages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx <= generationStage
                          ? 'w-5 bg-gradient-to-r from-primary to-secondary'
                          : 'w-1.5 bg-muted/20'
                      }`}
                    />
                  ))}
                </div>

                {/* スタイル連動インフォパネル */}
                {selectedStyle && (
                  <StyleInfoPanel
                    key={currentInfoPanel}
                    panelIndex={currentInfoPanel}
                    style={selectedStyle}
                    factIndex={currentFact}
                  />
                )}

                {/* 浮遊パーティクル装飾 */}
                <div className="relative h-0 pointer-events-none" aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-secondary/20 animate-floatUp"
                      style={{
                        left: `${10 + i * 20}%`,
                        bottom: '0',
                        animationDelay: `${i * 0.7}s`,
                        animationDuration: '4s'
                      }}
                    />
                  ))}
                </div>

                {/* キャンセルボタン */}
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mx-auto"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <button
                  onClick={() => void handleGenerate()}
                  disabled={!canGenerate || isGenerating}
                  className={`group relative min-w-[260px] px-8 py-4 text-base font-bold rounded-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-xl shadow-primary/25 transition-all duration-300 overflow-hidden flex items-center justify-center gap-2 ${
                    canGenerate
                      ? 'hover:shadow-primary/40 hover:scale-[1.05] cursor-pointer animate-subtlePulse'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  {canGenerate && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    肖像画を生成
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 bg-sale/10 border border-sale/20 rounded-lg text-center">
                <p className="text-sale text-sm mb-2">{error}</p>
                <button
                  onClick={() => { setError(null); void handleGenerate(); }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  もう一度試す
                </button>
              </div>
            )}

            {!isGenerating && !canGenerate && (
              <p className="mt-4 text-sm text-muted">
                {!hasPhoto && !selectedStyle
                  ? '写真のアップロードとスタイル選択が必要です'
                  : !hasPhoto
                    ? '写真をアップロードしてください'
                    : 'スタイルを選択してください'}
              </p>
            )}

            {!isGenerating && canGenerate && (
              <div className="mt-6 flex items-center gap-3 text-sm text-muted">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span>スタイル: {selectedStyle?.name || 'インテリジェント'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Image Preview */}
      {generatedImage && (
        <div className="space-y-8 animate-fadeIn">
          {/* Compare Section Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="w-8 h-px bg-secondary" />
              <span className="text-xs text-secondary tracking-[0.2em] font-medium">RESULT</span>
              <span className="w-8 h-px bg-secondary" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-foreground">
              変換結果
            </h3>
          </div>

          {/* Before/After Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Original */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-muted/30" />
                <p className="text-sm font-medium text-muted">Before</p>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 border-border/50 shadow-lg">
                <img
                  src={uploadState.previewUrl ?? ''}
                  alt="元の写真"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Generated */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <p className="text-sm font-medium text-primary">After</p>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 border-primary/30 shadow-xl shadow-primary/10 relative">
                <img
                  src={generatedImage}
                  alt="生成された肖像画"
                  className="w-full h-full object-cover"
                />
                {/* Watermark overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-6 py-3 bg-foreground/10 backdrop-blur-sm rounded-xl rotate-[-15deg]">
                    <p className="text-foreground/30 text-xl font-serif tracking-wider">
                      PREVIEW
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <StyledButton variant="outline" onClick={handleStartOver}>
              <RefreshCw className="w-4 h-4" />
              新しい写真で作成
            </StyledButton>
            <StyledButton variant="secondary" size="lg" onClick={() => navigate('/result')}>
              <Download className="w-5 h-5" />
              ダウンロード (¥2,900)
            </StyledButton>
            <StyledButton size="lg" onClick={() => navigate('/result')}>
              <ShoppingCart className="w-5 h-5" />
              プリント注文
            </StyledButton>
          </div>
        </div>
      )}
    </div>
  );
}
