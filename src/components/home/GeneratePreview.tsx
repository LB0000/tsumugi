import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Download, ShoppingCart, ArrowRight, Camera, Palette, Wand2, Frame } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateImage } from '../../api';
import { StyledButton } from '../common/StyledButton';

export function GeneratePreview() {
  const {
    uploadState,
    selectedStyle,
    selectedCategory,
    generatedImage,
    setGeneratedImage,
    setCurrentStep,
    resetUpload
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState(0);

  // Labor Illusion: ステージ付きプログレス表示
  const generationStages = [
    { icon: Camera, label: '画像を分析中...', progress: 15 },
    { icon: Palette, label: 'スタイルを適用中...', progress: 45 },
    { icon: Wand2, label: 'ディテールを調整中...', progress: 75 },
    { icon: Frame, label: '最終仕上げ中...', progress: 95 },
  ];

  // ステージを自動で進める
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStage(0);
      return;
    }

    const interval = setInterval(() => {
      setGenerationStage(prev => {
        if (prev < generationStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500); // 1.5秒ごとにステージを進める

    return () => clearInterval(interval);
  }, [isGenerating, generationStages.length]);

  const handleGenerate = async () => {
    if (!uploadState.previewUrl || !selectedStyle) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImage({
        baseImage: uploadState.previewUrl,
        styleId: selectedStyle.id,
        category: selectedCategory
      });

      setGeneratedImage(result.generatedImage);
      setCurrentStep('download');
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    resetUpload();
  };

  if (uploadState.status !== 'complete' || !uploadState.previewUrl) {
    return null;
  }

  return (
    <div className="mt-10 animate-fadeInUp">
      {/* Generate Button */}
      {!generatedImage && (
        <div className="text-center">
          <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              準備完了
            </h3>
            <p className="text-sm text-muted mb-6 max-w-xs">
              写真とスタイルが選択されました。<br />
              ボタンをクリックして肖像画を生成してください。
            </p>

            {isGenerating ? (
              <div className="w-full max-w-xs space-y-4">
                {/* プログレスバー */}
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${generationStages[generationStage].progress}%` }}
                  />
                </div>

                {/* ステージ表示 */}
                <div className="flex items-center justify-center gap-3 text-foreground">
                  {(() => {
                    const StageIcon = generationStages[generationStage].icon;
                    return <StageIcon className="w-5 h-5 text-primary animate-pulse" />;
                  })()}
                  <span className="font-medium">{generationStages[generationStage].label}</span>
                </div>

                {/* ステージインジケーター */}
                <div className="flex justify-center gap-2">
                  {generationStages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx <= generationStage ? 'bg-primary' : 'bg-muted/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <StyledButton
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="min-w-[240px]"
              >
                <Sparkles className="w-5 h-5" />
                肖像画を生成
                <ArrowRight className="w-4 h-4 ml-1" />
              </StyledButton>
            )}

            {error && (
              <div className="mt-4 px-4 py-2 bg-sale/10 border border-sale/20 rounded-lg">
                <p className="text-sale text-sm">{error}</p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 text-sm text-muted">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>スタイル: {selectedStyle?.name || 'インテリジェント'}</span>
            </div>
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
                    src={uploadState.previewUrl}
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
            <StyledButton variant="ghost" onClick={handleStartOver}>
              <RefreshCw className="w-4 h-4" />
              やり直す
            </StyledButton>
            <StyledButton variant="secondary" size="lg">
              <Download className="w-5 h-5" />
              ダウンロード (¥2,900)
            </StyledButton>
            <StyledButton size="lg">
              <ShoppingCart className="w-5 h-5" />
              プリント注文
            </StyledButton>
          </div>
        </div>
      )}
    </div>
  );
}
