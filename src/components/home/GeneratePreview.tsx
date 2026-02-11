import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Download, ShoppingCart, ArrowRight, Camera, Palette, Wand2, Frame } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { generateImage } from '../../api';
import { StyledButton } from '../common/StyledButton';

const artFacts = [
  'ルネサンス時代の肖像画は、数ヶ月かけて描かれました',
  'モナリザの制作には4年以上かかったと言われています',
  '浮世絵の版画は、最大20色の重ね刷りで表現されました',
  'バロック絵画では光と影のコントラストが重要視されました',
  '印象派の画家たちは、屋外で直接光を観察して描きました',
  '水墨画は「余白の美」を大切にする日本独自の美意識です',
];

export function GeneratePreview() {
  const {
    uploadState,
    selectedStyle,
    selectedCategory,
    generatedImage,
    setGeneratedImage,
    resetUpload
  } = useAppStore();
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);

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

  // アート豆知識を切り替え
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % artFacts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

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
      navigate('/result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    resetUpload();
  };

  const hasPhoto = uploadState.status === 'complete' && uploadState.previewUrl;
  const canGenerate = hasPhoto && selectedStyle;

  const estimatedSeconds = 15 - (generationStage * 3);
  const dynamicMessage = generationStage === generationStages.length - 1
    ? '完成間近です！'
    : `あと約${estimatedSeconds}秒...`;

  return (
    <div className="animate-fadeInUp">
      {/* Generate Button */}
      {!generatedImage && (
        <div className="text-center">
          <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border/50">
            {isGenerating ? (
              <div className="w-full max-w-sm space-y-5">
                {/* プログレスバー */}
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${generationStages[generationStage].progress}%` }}
                  />
                </div>

                {/* ステージ表示 + 推定時間 */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    {(() => {
                      const StageIcon = generationStages[generationStage].icon;
                      return <StageIcon className="w-5 h-5 text-primary animate-pulse" />;
                    })()}
                    <span className="font-medium">{generationStages[generationStage].label}</span>
                  </div>
                  <span className="text-muted text-xs">{dynamicMessage}</span>
                </div>

                {/* ステージドットインジケーター */}
                <div className="flex justify-center gap-2">
                  {generationStages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx <= generationStage ? 'w-6 bg-primary' : 'w-2 bg-muted/30'
                      }`}
                    />
                  ))}
                </div>

                {/* アート豆知識 */}
                <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-border/50">
                  <p className="text-xs text-secondary uppercase tracking-wider mb-1">豆知識</p>
                  <p className="text-sm text-foreground animate-fadeIn" key={currentFact}>
                    {artFacts[currentFact]}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
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
            )}

            {error && (
              <div className="mt-4 px-4 py-2 bg-sale/10 border border-sale/20 rounded-lg">
                <p className="text-sale text-sm">{error}</p>
              </div>
            )}

            {!canGenerate && (
              <p className="mt-4 text-sm text-muted">
                {!hasPhoto && !selectedStyle
                  ? '写真のアップロードとスタイル選択が必要です'
                  : !hasPhoto
                    ? '写真をアップロードしてください'
                    : 'スタイルを選択してください'}
              </p>
            )}

            {canGenerate && (
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
                  src={uploadState.previewUrl!}
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
