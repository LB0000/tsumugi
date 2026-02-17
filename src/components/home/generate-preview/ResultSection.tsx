import { RefreshCw, Download, ShoppingCart } from 'lucide-react';
import { StyledButton } from '../../common/StyledButton';

interface ResultSectionProps {
  generatedImage: string;
  uploadPreviewUrl: string;
  onStartOver: () => void;
  onNavigateResult: () => void;
}

export function ResultSection({
  generatedImage,
  uploadPreviewUrl,
  onStartOver,
  onNavigateResult,
}: ResultSectionProps) {
  return (
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
              src={uploadPreviewUrl}
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
        <StyledButton variant="outline" onClick={onStartOver}>
          <RefreshCw className="w-4 h-4" />
          新しい写真で作成
        </StyledButton>
        <StyledButton variant="secondary" size="lg" onClick={onNavigateResult}>
          <Download className="w-5 h-5" />
          データ購入へ
        </StyledButton>
        <StyledButton size="lg" onClick={onNavigateResult}>
          <ShoppingCart className="w-5 h-5" />
          プリント注文
        </StyledButton>
      </div>
    </div>
  );
}
