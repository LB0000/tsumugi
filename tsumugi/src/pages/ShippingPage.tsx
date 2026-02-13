import { Truck, Clock, Package, MapPin } from 'lucide-react';
import { Breadcrumb } from '../components/common';

export function ShippingPage() {
  return (
    <div className="flex-1 bg-background">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: '配送について' }]} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-8">配送について</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">送料</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              5,000円以上のご注文は送料無料です。5,000円未満の場合は全国一律500円を頂戴します。
            </p>
          </article>

          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">お届け目安</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              プリント商品は通常7〜14営業日で発送します。繁忙期は遅れる場合があります。
            </p>
          </article>
        </div>

        <div className="space-y-4">
          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">配送方法</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              注文内容と配送先に応じて、追跡可能な配送手段でお送りします。発送後に追跡番号をメールで通知します。
            </p>
          </article>

          <article className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">配送対象地域</h2>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              現在は日本国内のみ配送しています。離島・一部地域は通常より日数がかかる場合があります。
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
