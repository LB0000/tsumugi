import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, HelpCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StyledButton, Breadcrumb } from '../components/common';
import { submitContact } from '../api';
import { legalInfo } from '../data/legal';

type ContactReason = 'order' | 'product' | 'other';

const contactReasons: Array<{ id: ContactReason; label: string; icon: typeof Package }> = [
  { id: 'order', label: '注文について', icon: Package },
  { id: 'product', label: '商品について', icon: HelpCircle },
  { id: 'other', label: 'その他', icon: MessageSquare },
];

export function ContactPage() {
  const [selectedReason, setSelectedReason] = useState<ContactReason | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!selectedReason) {
      setError('お問い合わせ種別を選択してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await submitContact({
        reason: selectedReason,
        name,
        email,
        orderNumber: selectedReason === 'order' ? orderNumber : undefined,
        message,
      });
      setInquiryId(response.inquiryId);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました。しばらく経ってからもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-sage/10 flex items-center justify-center">
            <Send className="w-10 h-10 text-accent-sage" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">
            お問い合わせを受け付けました
          </h1>
          <p className="text-muted mb-6">
            内容を確認の上、2営業日以内にご登録のメールアドレスへ返信いたします。
            しばらくお待ちください。
          </p>
          {inquiryId && (
            <p className="text-sm text-muted mb-6">
              お問い合わせ番号: <span className="font-mono text-foreground">{inquiryId}</span>
            </p>
          )}
          <Link to="/">
            <StyledButton>トップページに戻る</StyledButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Breadcrumb items={[{ label: 'お問い合わせ' }]} />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-secondary" />
            <MessageSquare className="w-6 h-6 text-secondary" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-secondary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-3">
            お問い合わせ
          </h1>
          <p className="text-muted">
            ご質問・ご相談はこちらからお気軽にどうぞ
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h2 className="font-semibold text-foreground mb-6">連絡先情報</h2>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">メール</p>
                    <a href="mailto:support@tsumugi.jp" className="text-sm text-primary hover:underline">
                      support@tsumugi.jp
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">電話</p>
                    <a href="tel:0120-000-000" className="text-sm text-primary hover:underline">
                      0120-000-000
                    </a>
                    <p className="text-xs text-muted mt-0.5">（通話無料）</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-sage/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-accent-sage" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">営業時間</p>
                    <p className="text-sm text-muted">平日 10:00 - 18:00</p>
                    <p className="text-xs text-muted mt-0.5">（土日祝日休業）</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-coral/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-accent-coral" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">所在地</p>
                    <p className="text-sm text-muted">{legalInfo.所在地}</p>
                  </div>
                </div>
              </div>

              {/* FAQ Link */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted mb-3">
                  よくある質問をご確認いただくと、すぐに解決できることがあります。
                </p>
                <Link to="/faq" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" />
                  よくある質問を見る
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  お問い合わせの種類 <span className="text-sale">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {contactReasons.map((reason) => {
                    const Icon = reason.icon;
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => setSelectedReason(reason.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          selectedReason === reason.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          selectedReason === reason.id ? 'text-primary' : 'text-muted'
                        }`} />
                        <span className={`text-sm font-medium ${
                          selectedReason === reason.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {reason.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Number (conditional) */}
              {selectedReason === 'order' && (
                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-medium text-foreground mb-2">
                    注文番号
                  </label>
                  <input
                    id="orderNumber"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="AG-XXXXXXXX"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  お名前 <span className="text-sale">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  メールアドレス <span className="text-sale">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  お問い合わせ内容 <span className="text-sale">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="お問い合わせ内容をご記入ください"
                  rows={6}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-sale/10 border border-sale/20 rounded-lg">
                  <p className="text-sale text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <StyledButton
                  type="submit"
                  size="lg"
                  disabled={!selectedReason || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      送信する
                    </>
                  )}
                </StyledButton>
              </div>

              <p className="text-xs text-muted">
                <span className="text-sale">*</span> は必須項目です。
                いただいた個人情報は、お問い合わせへの回答にのみ使用いたします。
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
