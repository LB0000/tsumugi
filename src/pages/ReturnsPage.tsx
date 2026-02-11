import { RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { Breadcrumb } from '../components/common';

export function ReturnsPage() {
  return (
    <div className="flex-1 bg-background">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: '返品・交換' }]} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-8">返品・交換について</h1>

        <div className="space-y-6">
          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">デジタル商品の返品</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              デジタル商品の性質上、ダウンロード後の返品・返金は原則お受けできません。
            </p>
          </article>

          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">不良品・破損時の対応</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              プリント商品に不良・破損があった場合、到着後7日以内にお問い合わせください。確認後、交換対応します。
            </p>
          </article>

          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">返品手続き</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              注文番号と商品状態のわかる写真を添えて、サポート窓口までご連絡ください。担当者が手順を案内します。
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
