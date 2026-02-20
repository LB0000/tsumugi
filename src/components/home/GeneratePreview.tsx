import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateImage, ApiError } from '../../api';
import { trackEvent } from '../../lib/analytics';
import { useCredits } from '../../hooks/useCredits';
import { needsCharge } from '../../types/credits';
import { ChargeModal } from '../charge/ChargeModal';
import { FreeTrialCompleteModal } from '../charge/FreeTrialCompleteModal';
import { computeProgress, stageFromProgress } from './generate-preview/generationStages';
import { GeneratingUI } from './generate-preview/GeneratingUI';
import { ResultSection } from './generate-preview/ResultSection';

export function GeneratePreview() {
  const {
    uploadState,
    selectedStyle,
    selectedCategory,
    generatedImage,
    setGeneratedImage,
    setGallerySaved,
    resetUpload,
  } = useAppStore();
  const navigate = useNavigate();
  const { credits, refresh: refreshCredits } = useCredits();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showFreeTrialModal, setShowFreeTrialModal] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [currentInfoPanel, setCurrentInfoPanel] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 経過時間ベースの漸近プログレス（rAF で駆動、~10fps にスロットル）
  // 指数減衰カーブにより生成時間に関わらず自然に減速し、98%付近で停滞しない
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStage(0);
      setSmoothProgress(0);
      return;
    }

    const startTime = performance.now();
    let rafId: number;
    let lastUpdate = 0;

    const animate = (now: number) => {
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        const elapsed = now - startTime;
        const progress = computeProgress(elapsed);
        setSmoothProgress(progress);
        setGenerationStage(stageFromProgress(progress));
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isGenerating]);

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

  // タブを閉じる/リロード時の警告
  useEffect(() => {
    if (!isGenerating) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isGenerating]);

  const handleGenerate = async () => {
    const fileToSend = uploadState.croppedFile ?? uploadState.rawFile;
    if (!uploadState.previewUrl || !selectedStyle || !fileToSend) return;

    // Credit check: if user has credits info and is out of credits, show modal
    if (credits && needsCharge(credits)) {
      // Show free trial modal only when user just exhausted free credits (never purchased)
      if (credits.totalUsed === 3 && credits.paidRemaining === 0) {
        setShowFreeTrialModal(true);
      } else {
        setShowChargeModal(true);
      }
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError(null);
    setCurrentInfoPanel(0);
    setCurrentFact(0);

    try {
      const result = await generateImage({
        file: fileToSend,
        styleId: selectedStyle.id,
        category: selectedCategory,
      }, controller.signal);

      setGeneratedImage(result.generatedImage);
      setGallerySaved(result.gallerySaved ?? null);
      trackEvent('image_generate');
      // Refresh credits after successful generation (server consumed 1 credit)
      void refreshCredits();
      navigate('/result');
    } catch (err) {
      if ((err instanceof Error || err instanceof DOMException) && err.name === 'AbortError') {
        setError('生成をキャンセルしました');
        return;
      }
      const message = err instanceof Error ? err.message : '画像の生成に失敗しました';
      // Handle credit-related errors by error code
      if (err instanceof ApiError) {
        if (err.code === 'FREE_TRIAL_EXHAUSTED') {
          navigate('/login', { state: { from: '/' } });
          return;
        }
        if (err.code === 'INSUFFICIENT_CREDITS' || err.code === 'NO_CREDIT_BALANCE') {
          void refreshCredits();
          setShowChargeModal(true);
          return;
        }
      }
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenCharge = () => {
    setShowFreeTrialModal(false);
    setShowChargeModal(true);
  };

  const handleChargeComplete = async () => {
    // Placeholder: actual Square payment flow will be wired here
    // For now, refresh credits after charge modal interaction
    await refreshCredits();
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const hasPhoto = uploadState.status === 'complete' && Boolean(uploadState.previewUrl);
  const canGenerate = hasPhoto && Boolean(selectedStyle) && Boolean(uploadState.croppedFile ?? uploadState.rawFile);

  const progressColors: [string, string] = [
    selectedStyle?.colorPalette[0] || '#8B4513',
    selectedStyle?.colorPalette[1] || '#B8860B',
  ];

  return (
    <div className="animate-fadeInUp">
      {/* Generate Button */}
      {!generatedImage && (
        <div className="text-center">
          <div className="inline-flex flex-col items-center p-4 sm:p-8 rounded-3xl glass-card max-w-lg w-full">
            {isGenerating && selectedStyle ? (
              <GeneratingUI
                smoothProgress={smoothProgress}
                generationStage={generationStage}
                uploadPreviewUrl={uploadState.croppedPreviewUrl ?? uploadState.previewUrl ?? ''}
                progressColors={progressColors}
                selectedStyle={selectedStyle}
                currentInfoPanel={currentInfoPanel}
                currentFact={currentFact}
                onCancel={handleCancel}
              />
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
        <ResultSection
          generatedImage={generatedImage}
          uploadPreviewUrl={uploadState.croppedPreviewUrl ?? uploadState.previewUrl ?? ''}
          onStartOver={resetUpload}
          onNavigateResult={() => navigate('/result')}
        />
      )}

      {/* Credit Charge Modals */}
      <ChargeModal
        isOpen={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        onCharge={handleChargeComplete}
      />
      <FreeTrialCompleteModal
        isOpen={showFreeTrialModal}
        onClose={() => setShowFreeTrialModal(false)}
        onCharge={handleOpenCharge}
      />
    </div>
  );
}
