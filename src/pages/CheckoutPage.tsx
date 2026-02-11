import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { StyledButton, Breadcrumb } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { useSquarePayments } from '../hooks/useSquarePayments';
import { createOrder, processPayment } from '../api';
import type { ShippingAddress } from '../types';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useAppStore();
  const { isReady, error: squareError, attachCard, tokenize } = useSquarePayments();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardAttached, setCardAttached] = useState(false);

  const [form, setForm] = useState<ShippingAddress>({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    addressLine: '',
  });

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 500;
  const total = subtotal + shipping;

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  // Attach Square card form when SDK is ready
  useEffect(() => {
    if (isReady && !cardAttached) {
      attachCard('#card-container')
        .then(() => setCardAttached(true))
        .catch((e) => setError(e instanceof Error ? e.message : 'カード入力の初期化に失敗しました'));
    }
  }, [isReady, cardAttached, attachCard]);

  const updateForm = (field: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.lastName || !form.firstName) return 'お名前を入力してください';
    if (!form.email || !form.email.includes('@')) return '有効なメールアドレスを入力してください';
    if (!form.phone) return '電話番号を入力してください';
    if (!form.postalCode || !/^\d{3}-?\d{4}$/.test(form.postalCode)) return '正しい郵便番号を入力してください（例: 100-0001）';
    if (!form.prefecture) return '都道府県を選択してください';
    if (!form.city) return '市区町村を入力してください';
    if (!form.addressLine) return '番地・建物名を入力してください';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Tokenize card
      const sourceId = await tokenize();

      // 2. Create order on backend
      const orderResponse = await createOrder({
        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: form,
      });

      // 3. Process payment
      const paymentResponse = await processPayment({
        sourceId,
        orderId: orderResponse.orderId,
        buyerEmail: form.email,
        totalAmount: orderResponse.totalAmount,
      });

      // 4. Success - navigate to confirmation
      clearCart();
      navigate('/order-confirmation', {
        state: {
          orderId: paymentResponse.orderId,
          paymentId: paymentResponse.paymentId,
          totalAmount: orderResponse.totalAmount,
          receiptUrl: paymentResponse.receiptUrl,
          shippingAddress: form,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '決済処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="flex-1 bg-background">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Breadcrumb items={[
          { label: 'カート', path: '/cart' },
          { label: 'お支払い' },
        ]} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-8">お支払い</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Address */}
              <section className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Truck className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">配送先情報</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">姓</label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      placeholder="山田"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">名</label>
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      placeholder="太郎"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">メールアドレス</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">電話番号</label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="090-1234-5678"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-foreground mb-1">郵便番号</label>
                    <input
                      id="postalCode"
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => updateForm('postalCode', e.target.value)}
                      placeholder="100-0001"
                      maxLength={8}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="prefecture" className="block text-sm font-medium text-foreground mb-1">都道府県</label>
                    <select
                      id="prefecture"
                      value={form.prefecture}
                      onChange={(e) => updateForm('prefecture', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map((pref) => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">市区町村</label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="千代田区"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="addressLine" className="block text-sm font-medium text-foreground mb-1">番地・建物名</label>
                    <input
                      id="addressLine"
                      type="text"
                      value={form.addressLine}
                      onChange={(e) => updateForm('addressLine', e.target.value)}
                      placeholder="千代田1-1 〇〇ビル 101号室"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">お支払い方法</h2>
                </div>

                {squareError ? (
                  <p className="text-sale text-sm">{squareError}</p>
                ) : !isReady ? (
                  <div className="flex items-center gap-2 text-muted py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>決済フォームを読み込み中...</span>
                  </div>
                ) : null}

                <div id="card-container" className="min-h-[44px]" />

                <div className="flex items-center gap-2 mt-4 text-xs text-muted">
                  <ShieldCheck className="w-4 h-4" />
                  <span>カード情報はSquareが安全に処理します。当サイトではカード情報を保存しません。</span>
                </div>
              </section>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">注文内容</h3>

                <div className="space-y-3 mb-4 pb-4 border-b border-border">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted">
                        {item.name} ×{item.quantity}
                      </span>
                      <span className="text-foreground">¥{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">小計</span>
                    <span className="text-foreground">¥{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">送料</span>
                    <span className="text-foreground">
                      {shipping === 0 ? (
                        <span className="text-accent-sage">無料</span>
                      ) : (
                        `¥${shipping.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between mb-6">
                  <span className="font-semibold text-foreground">合計（税込）</span>
                  <span className="text-xl font-bold text-primary">¥{total.toLocaleString()}</span>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-sale/10 border border-sale/20 rounded-lg text-sm text-sale">
                    {error}
                  </div>
                )}

                <StyledButton
                  type="submit"
                  className="w-full mb-4"
                  size="lg"
                  disabled={isProcessing || !cardAttached}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    `¥${total.toLocaleString()} を支払う`
                  )}
                </StyledButton>

                <Link to="/cart" className="flex items-center justify-center gap-1 text-sm text-primary hover:underline">
                  <ArrowLeft className="w-4 h-4" />
                  カートに戻る
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
