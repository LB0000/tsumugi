import { Link } from 'react-router-dom';
import { CreditCard, Shield, Truck, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto bg-foreground text-background">
      {/* Trust Badges - 和モダン装飾付き */}
      <div className="bg-primary/95">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 装飾ライン */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-px bg-secondary/50" />
            <div className="w-1.5 h-1.5 rotate-45 bg-secondary" />
            <span className="text-secondary/80 text-xs tracking-[0.3em] font-medium">安心のサービス</span>
            <div className="w-1.5 h-1.5 rotate-45 bg-secondary" />
            <div className="w-12 h-px bg-secondary/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 justify-center group">
              <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/20 transition-colors">
                <Truck className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-background text-sm">全国送料無料</p>
                <p className="text-xs text-background/70">5,000円以上のご注文で</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center group">
              <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/20 transition-colors">
                <Shield className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-background text-sm">品質保証</p>
                <p className="text-xs text-background/70">ご満足いただけない場合は全額返金</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center group">
              <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/20 transition-colors">
                <CreditCard className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium text-background text-sm">安全な決済</p>
                <p className="text-xs text-background/70">SSL暗号化通信で安心</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Company Info - 2カラム分 */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <div className="flex flex-col">
                <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-foreground/10 mb-6">
                  紡
                </h2>
                <p className="text-foreground/20 text-sm tracking-[0.5em] mb-8 font-serif">TSUMUGI</p>
                <span className="text-[10px] text-secondary tracking-[0.3em] uppercase mt-1">
                  Art Gift Japan
                </span>
              </div>
            </Link>
            <p className="text-sm text-background/70 mb-6 leading-relaxed max-w-sm">
              AIの技術と日本の美意識を融合し、大切な方の写真を格調高い肖像画に変換いたします。唯一無二の贈り物をお届けする、それが私たちの使命です。
            </p>

            {/* 評価 */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-background/5 rounded-lg inline-block">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-secondary text-sm">★</span>
                ))}
              </div>
              <span className="text-sm text-background/80">4.8 / 5.0</span>
              <span className="text-xs text-background/50">（1,247件のレビュー）</span>
            </div>

            {/* 連絡先 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-background/70">
                <Mail className="w-4 h-4 text-secondary" />
                <span className="text-sm">support@artgift.jp</span>
              </div>
              <div className="flex items-center gap-3 text-background/70">
                <Phone className="w-4 h-4 text-secondary" />
                <span className="text-sm">0120-000-000（平日 10:00-18:00）</span>
              </div>
              <div className="flex items-center gap-3 text-background/70">
                <MapPin className="w-4 h-4 text-secondary" />
                <span className="text-sm">東京都渋谷区</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-background mb-5 text-sm tracking-wider flex items-center gap-2">
              <span className="w-6 h-px bg-secondary" />
              サービス
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/?category=pets" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  ペット肖像画
                </Link>
              </li>
              <li>
                <Link to="/?category=family" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  ファミリー肖像画
                </Link>
              </li>
              <li>
                <Link to="/?category=kids" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  キッズ肖像画
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  料金プラン
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-background mb-5 text-sm tracking-wider flex items-center gap-2">
              <span className="w-6 h-px bg-secondary" />
              お客様サポート
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/faq" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  よくある質問
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  お問い合わせ
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  配送について
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  返品・交換
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-background mb-5 text-sm tracking-wider flex items-center gap-2">
              <span className="w-6 h-px bg-secondary" />
              法的情報
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/legal" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link to="/company" className="text-sm text-background/70 hover:text-secondary transition-colors">
                  会社概要
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sub Footer */}
      <div className="border-t border-background/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Payment Methods */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-background/50">お支払い方法:</span>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-background/10 border border-background/20 rounded text-xs font-medium text-background/80 hover:bg-background/20 transition-colors">VISA</div>
                <div className="px-3 py-1.5 bg-background/10 border border-background/20 rounded text-xs font-medium text-background/80 hover:bg-background/20 transition-colors">Mastercard</div>
                <div className="px-3 py-1.5 bg-background/10 border border-background/20 rounded text-xs font-medium text-background/80 hover:bg-background/20 transition-colors">JCB</div>
                <div className="px-3 py-1.5 bg-background/10 border border-background/20 rounded text-xs font-medium text-background/80 hover:bg-background/20 transition-colors">AMEX</div>
                <div className="px-3 py-1.5 bg-background/10 border border-background/20 rounded text-xs font-medium text-background/80 hover:bg-background/20 transition-colors">PayPay</div>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-xs text-background/50">
              © 2024 TSUMUGI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
