import { Shield } from 'lucide-react';
import { Breadcrumb } from '../components/common';
import { legalInfo } from '../data/legal';

export function PrivacyPage() {
  return (
    <div className="flex-1 bg-background">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: 'プライバシーポリシー' }]} />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-secondary" />
            <Shield className="w-6 h-6 text-secondary" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-secondary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-3">
            プライバシーポリシー
          </h1>
          <p className="text-muted">最終更新日: 2026年2月12日</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">1. はじめに</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                TSUMUGI（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と考え、
                以下のプライバシーポリシーに従って個人情報を取り扱います。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">2. 収集する情報</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>当社は、以下の情報を収集することがあります。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>氏名、メールアドレス、電話番号、住所等の連絡先情報</li>
                <li>決済に必要な情報（カード情報は決済代行事業者Squareが処理し、当社サーバーでは保存しません）</li>
                <li>アップロード画像および生成画像（画像生成処理のため）</li>
                <li>お問い合わせ内容、サービス利用履歴、購入履歴</li>
                <li>IPアドレス、ブラウザの種類、アクセス日時等のログ情報</li>
                <li>Cookie情報（認証セッション管理およびCSRF対策を含む）</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">3. 情報の利用目的</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>収集した情報は、以下の目的で利用します。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>サービスの提供および運営</li>
                <li>お問い合わせへの対応</li>
                <li>商品の配送および請求処理</li>
                <li>サービス改善のための分析</li>
                <li>新機能やキャンペーン等のお知らせ（同意を得た場合）</li>
                <li>不正利用の防止</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">4. 情報の共有</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>当社は、以下の場合を除き、お客様の個人情報を第三者に開示しません。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>お客様の同意がある場合</li>
                <li>法令に基づく場合</li>
                <li>サービス提供に必要な業務委託先（配送業者、決済代行業者等）への提供</li>
                <li>当社の権利や財産を保護するために必要な場合</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">5. 写真データの取り扱い</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                お客様がアップロードした画像は、肖像画生成の目的に限定して利用します。画像生成時には、
                外部AIサービス（Google Gemini）に画像データを送信して処理します。
              </p>
              <p>
                当社サーバーは、通常運用でアップロード画像ファイルおよび生成画像ファイルを恒久保存しません。
                生成プレビューは主にブラウザ内セッションで保持され、同一端末利用時の漏洩防止のためログアウト時にクリアされます。
              </p>
              <p>
                機微情報（顔写真、身分証、医療情報など）を含む画像のアップロードは避けてください。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">6. Cookieの使用</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社のウェブサイトでは、ユーザー体験の向上およびサービス改善のためにCookieを使用しています。
                ブラウザの設定でCookieを無効にすることができますが、一部の機能が利用できなくなる場合があります。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">7. セキュリティ</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社は、お客様の個人情報を不正アクセス、紛失、破壊、改ざん、漏洩から保護するために、
                適切な技術的および組織的措置を講じています。
                すべての通信はSSL/TLSにより暗号化されています。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">8. お客様の権利</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>お客様は、ご自身の個人情報について以下の権利を有します。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>個人情報の開示請求</li>
                <li>個人情報の訂正・削除請求</li>
                <li>個人情報の利用停止請求</li>
                <li>マーケティング目的での利用のオプトアウト</li>
              </ul>
              <p>
                これらの権利を行使される場合は、お問い合わせフォームよりご連絡ください。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">9. ポリシーの変更</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                当社は、必要に応じて本ポリシーを変更することがあります。
                重要な変更がある場合は、ウェブサイト上での告知またはメールにてお知らせします。
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">10. お問い合わせ</h2>
            <div className="text-muted leading-relaxed space-y-3">
              <p>
                本ポリシーに関するお問い合わせは、以下までご連絡ください。
              </p>
              <div className="bg-card p-4 rounded-lg border border-border mt-4">
                <p className="font-medium text-foreground mb-2">TSUMUGI 個人情報保護担当</p>
                <p>メール: privacy@tsumugi.jp</p>
                <p>電話: {legalInfo['電話番号']}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
