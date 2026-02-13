import { legalInfo } from '../data/legal';
import { Breadcrumb } from '../components/common';

export function LegalPage() {
  return (
    <div className="flex-1 py-12 bg-background">
      <div className="max-w-3xl mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: '特定商取引法に基づく表記' }]}
          className="mb-8"
        />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
            特定商取引法に基づく表記
          </h1>
          <p className="text-muted">
            アートギフトのサービスをご利用いただくにあたり、以下の内容をご確認ください。
          </p>
        </div>

        {/* Legal Information Table */}
        <div className="bg-card rounded-[var(--radius-card)] border border-border overflow-hidden">
          <table className="w-full">
            <tbody>
              {Object.entries(legalInfo).map(([key, value], index) => (
                <tr
                  key={key}
                  className={index !== Object.entries(legalInfo).length - 1 ? 'border-b border-border' : ''}
                >
                  <th className="px-6 py-4 text-left bg-card-hover text-foreground font-medium w-1/3 align-top">
                    {key}
                  </th>
                  <td className="px-6 py-4 text-muted">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Additional Notes */}
        <div className="mt-8 p-6 bg-card rounded-[var(--radius-card)] border border-border">
          <h2 className="font-semibold text-foreground mb-4">ご注意事項</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>・ 表示価格はすべて税込価格です。</li>
            <li>・ 商品の性質上、お客様都合による返品・交換はお受けできません。</li>
            <li>・ プリント商品の配送は日本国内のみとなります。</li>
            <li>・ お支払い方法により、別途手数料がかかる場合があります。</li>
          </ul>
        </div>

        {/* Contact Section */}
        <div className="mt-8 text-center">
          <p className="text-muted mb-4">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
          <a
            href="/support"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-[var(--radius-button)] hover:bg-primary-hover transition-colors font-medium"
          >
            お問い合わせはこちら
          </a>
        </div>
      </div>
    </div>
  );
}
