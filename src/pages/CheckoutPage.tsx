import { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, ArrowLeft, Loader2, Gift } from 'lucide-react';
import { StyledButton, Breadcrumb } from '../components/common';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { useSquarePayments } from '../hooks/useSquarePayments';
import { createOrder, processPayment, getAddresses } from '../api';
import type { SavedAddressItem } from '../api';
import type { ShippingAddress } from '../types';
import { trackEvent, trackMetaInitiateCheckout } from '../lib/analytics';
import { giftWrappingOptions, noshiTypes } from '../data/giftOptions';
import {
  validateShippingField,
  validateShippingForm,
  getFirstShippingError,
  SHIPPING_FIELD_ORDER,
  type ShippingField,
  type ShippingFieldErrors,
} from './checkout/validation';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

type CheckoutState = {
  isProcessing: boolean;
  error: string | null;
  cardAttached: boolean;
  isLoadingAddresses: boolean;
};

type CheckoutAction =
  | { type: 'START_PROCESSING' }
  | { type: 'FINISH_PROCESSING' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CARD_ATTACHED' }
  | { type: 'LOADING_ADDRESSES' }
  | { type: 'ADDRESSES_LOADED' };

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, error: null };
    case 'FINISH_PROCESSING':
      return { ...state, isProcessing: false };
    case 'SET_ERROR':
      return { ...state, isProcessing: false, error: action.payload };
    case 'CARD_ATTACHED':
      return { ...state, cardAttached: true };
    case 'LOADING_ADDRESSES':
      return { ...state, isLoadingAddresses: true };
    case 'ADDRESSES_LOADED':
      return { ...state, isLoadingAddresses: false };
    default:
      return state;
  }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCartStore();
  const { authUser } = useAuthStore();
  const { isReady, error: squareError, attachCard, tokenize, retry } = useSquarePayments();

  const [state, dispatch] = useReducer(checkoutReducer, {
    isProcessing: false,
    error: null,
    cardAttached: false,
    isLoadingAddresses: false,
  });
  const checkoutAttemptIdRef = useRef<string | null>(null);
  const formTouchedRef = useRef(false);
  const cardInitRef = useRef(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);

  const { giftOptions, setGiftOptions, clearGiftOptions } = useAppStore();
  const [differentRecipient, setDifferentRecipient] = useState(false);
  const [recipientForm, setRecipientForm] = useState<ShippingAddress>({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    addressLine: '',
  });

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
  const [fieldErrors, setFieldErrors] = useState<ShippingFieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<ShippingField, boolean>>>({});

  const wrappingPrice = useMemo(() => {
    if (!giftOptions?.isGift || !giftOptions.wrappingId) return 0;
    const option = giftWrappingOptions.find((o) => o.id === giftOptions.wrappingId);
    return option?.price ?? 0;
  }, [giftOptions]);

  const { subtotal, shipping, total } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 5000 ? 0 : 500;
    const total = subtotal + shipping + wrappingPrice;
    return { subtotal, shipping, total };
  }, [cartItems, wrappingPrice]);

  useEffect(() => {
    trackEvent('begin_checkout');
    trackMetaInitiateCheckout({
      num_items: cartItems.length,
      value: total,
      currency: 'JPY',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  // Attach Square card form when SDK is ready
  useEffect(() => {
    if (isReady && !state.cardAttached && !cardInitRef.current) {
      cardInitRef.current = true;
      attachCard('#card-container')
        .then(() => dispatch({ type: 'CARD_ATTACHED' }))
        .catch((e) => {
          cardInitRef.current = false;
          dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'カード入力の初期化に失敗しました' });
        });
    }
  }, [isReady, state.cardAttached, attachCard]);

  useEffect(() => {
    checkoutAttemptIdRef.current = null;
  }, [cartItems]);

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (!authUser) return;
    dispatch({ type: 'LOADING_ADDRESSES' });
    void getAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        // Auto-fill with default address
        const defaultAddr = addrs.find((a) => a.isDefault) ?? (addrs.length === 1 ? addrs[0] : null);
        if (defaultAddr && !formTouchedRef.current) {
          setForm({
            lastName: defaultAddr.lastName,
            firstName: defaultAddr.firstName,
            email: defaultAddr.email,
            phone: defaultAddr.phone,
            postalCode: defaultAddr.postalCode,
            prefecture: defaultAddr.prefecture,
            city: defaultAddr.city,
            addressLine: defaultAddr.addressLine,
          });
        }
      })
      .catch(() => {
        dispatch({ type: 'SET_ERROR', payload: '保存済み配送先の読み込みに失敗しました' });
      })
      .finally(() => {
        dispatch({ type: 'ADDRESSES_LOADED' });
      });
  }, [authUser]);

  const applySavedAddress = (addr: SavedAddressItem) => {
    formTouchedRef.current = true;
    setForm({
      lastName: addr.lastName,
      firstName: addr.firstName,
      email: addr.email,
      phone: addr.phone,
      postalCode: addr.postalCode,
      prefecture: addr.prefecture,
      city: addr.city,
      addressLine: addr.addressLine,
    });
    setTouchedFields({});
    setFieldErrors({});
  };

  const updateForm = (field: ShippingField, value: string) => {
    formTouchedRef.current = true;
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    setForm((prev) => ({ ...prev, [field]: value }));
    const message = validateShippingField(field, value);
    setFieldErrors((prevErrors) => ({ ...prevErrors, [field]: message ?? undefined }));
  };

  const updateRecipientForm = (field: keyof ShippingAddress, value: string) => {
    setRecipientForm((prev) => ({ ...prev, [field]: value }));
  };

  const touchAllFields = () => {
    const touched: Partial<Record<ShippingField, boolean>> = {};
    for (const field of SHIPPING_FIELD_ORDER) {
      touched[field] = true;
    }
    setTouchedFields(touched);
  };

  const getFieldError = (field: ShippingField): string | null => {
    if (!touchedFields[field]) return null;
    return fieldErrors[field] ?? null;
  };

  const getFieldInputClass = (field: ShippingField): string => {
    const hasError = Boolean(getFieldError(field));
    return `w-full px-3 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-sale focus:ring-sale/30'
        : 'border-border focus:ring-primary/50'
    }`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_ERROR', payload: null });

    const errors = validateShippingForm(form);
    setFieldErrors(errors);
    touchAllFields();

    const validationError = getFirstShippingError(errors);
    if (validationError) {
      dispatch({ type: 'SET_ERROR', payload: `配送先情報: ${validationError}` });
      return;
    }

    dispatch({ type: 'START_PROCESSING' });

    try {
      const clientRequestId = checkoutAttemptIdRef.current ?? crypto.randomUUID();
      checkoutAttemptIdRef.current = clientRequestId;

      // 1. Tokenize card
      const sourceId = await tokenize();

      // 2. Create order on backend
      const orderResponse = await createOrder({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: form,
        clientRequestId,
        ...(giftOptions?.isGift && {
          giftOptions: {
            isGift: true,
            wrappingId: giftOptions.wrappingId ?? undefined,
            noshiType: giftOptions.noshiType ?? undefined,
            messageCard: giftOptions.messageCard || undefined,
            ...(differentRecipient && { recipientAddress: recipientForm }),
          },
        }),
      });

      // 3. Process payment
      const paymentResponse = await processPayment({
        sourceId,
        orderId: orderResponse.orderId,
        buyerEmail: form.email,
        clientRequestId,
      });

      // 4. Success - navigate to confirmation
      clearCart();
      clearGiftOptions();
      checkoutAttemptIdRef.current = null;
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
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '決済処理中にエラーが発生しました' });
    } finally {
      dispatch({ type: 'FINISH_PROCESSING' });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted mb-3">カートを確認しています...</p>
          <Link to="/cart" className="text-sm text-primary hover:underline">
            カートへ戻る
          </Link>
        </div>
      </div>
    );
  }

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

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-8">
              {/* Gift Options */}
              <section className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-lg text-foreground">ギフトオプション</h2>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giftOptions?.isGift ?? false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGiftOptions({ isGift: true, wrappingId: 'standard', noshiType: null, messageCard: '' });
                        } else {
                          clearGiftOptions();
                          setDifferentRecipient(false);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    <span className="ml-2 text-sm text-foreground">ギフトとして購入する</span>
                  </label>
                </div>

                {giftOptions?.isGift && (
                  <div className="space-y-5 pt-2 border-t border-border mt-2">
                    {/* Wrapping Selection */}
                    <div className="pt-4">
                      <label className="block text-sm font-medium text-foreground mb-3">ラッピング選択</label>
                      <div className="space-y-2">
                        {giftWrappingOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              giftOptions.wrappingId === option.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="wrapping"
                              value={option.id}
                              checked={giftOptions.wrappingId === option.id}
                              onChange={() => setGiftOptions({
                                ...giftOptions,
                                wrappingId: option.id,
                                noshiType: option.id === 'noshi' ? giftOptions.noshiType ?? 'oiwai' : null,
                              })}
                              className="accent-primary"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{option.name}</span>
                                <span className="text-sm text-primary font-medium">
                                  {option.price === 0 ? '無料' : `+¥${option.price.toLocaleString()}`}
                                </span>
                              </div>
                              <p className="text-xs text-muted mt-0.5">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Noshi Type - only when wrapping is 'noshi' */}
                    {giftOptions.wrappingId === 'noshi' && (
                      <div>
                        <label htmlFor="noshiType" className="block text-sm font-medium text-foreground mb-1">のし紙の表書き</label>
                        <select
                          id="noshiType"
                          value={giftOptions.noshiType ?? 'oiwai'}
                          onChange={(e) => setGiftOptions({ ...giftOptions, noshiType: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {noshiTypes.map((type) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Message Card */}
                    <div>
                      <label htmlFor="messageCard" className="block text-sm font-medium text-foreground mb-1">メッセージカード</label>
                      <textarea
                        id="messageCard"
                        value={giftOptions.messageCard}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setGiftOptions({ ...giftOptions, messageCard: e.target.value });
                          }
                        }}
                        placeholder="お祝いのメッセージを入力してください（任意）"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                      <p className="text-xs text-muted text-right mt-1">{giftOptions.messageCard.length}/200</p>
                    </div>

                    {/* Different Recipient */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={differentRecipient}
                          onChange={(e) => setDifferentRecipient(e.target.checked)}
                          className="accent-primary w-4 h-4"
                        />
                        <span className="text-sm text-foreground">送り先は自分と異なる</span>
                      </label>

                      {differentRecipient && (
                        <div className="mt-4 p-4 rounded-lg border border-border bg-background/50">
                          <p className="text-sm font-medium text-foreground mb-3">お届け先情報</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="recipientLastName" className="block text-sm font-medium text-foreground mb-1">姓</label>
                              <input
                                id="recipientLastName"
                                type="text"
                                value={recipientForm.lastName}
                                onChange={(e) => updateRecipientForm('lastName', e.target.value)}
                                placeholder="山田"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div>
                              <label htmlFor="recipientFirstName" className="block text-sm font-medium text-foreground mb-1">名</label>
                              <input
                                id="recipientFirstName"
                                type="text"
                                value={recipientForm.firstName}
                                onChange={(e) => updateRecipientForm('firstName', e.target.value)}
                                placeholder="太郎"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div>
                              <label htmlFor="recipientEmail" className="block text-sm font-medium text-foreground mb-1">メールアドレス</label>
                              <input
                                id="recipientEmail"
                                type="email"
                                value={recipientForm.email}
                                onChange={(e) => updateRecipientForm('email', e.target.value)}
                                placeholder="example@email.com"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div>
                              <label htmlFor="recipientPhone" className="block text-sm font-medium text-foreground mb-1">電話番号</label>
                              <input
                                id="recipientPhone"
                                type="tel"
                                value={recipientForm.phone}
                                onChange={(e) => updateRecipientForm('phone', e.target.value)}
                                placeholder="090-1234-5678"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div>
                              <label htmlFor="recipientPostalCode" className="block text-sm font-medium text-foreground mb-1">郵便番号</label>
                              <input
                                id="recipientPostalCode"
                                type="text"
                                value={recipientForm.postalCode}
                                onChange={(e) => updateRecipientForm('postalCode', e.target.value)}
                                placeholder="100-0001"
                                maxLength={8}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div>
                              <label htmlFor="recipientPrefecture" className="block text-sm font-medium text-foreground mb-1">都道府県</label>
                              <select
                                id="recipientPrefecture"
                                value={recipientForm.prefecture}
                                onChange={(e) => updateRecipientForm('prefecture', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              >
                                <option value="">選択してください</option>
                                {PREFECTURES.map((pref) => (
                                  <option key={pref} value={pref}>{pref}</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="recipientCity" className="block text-sm font-medium text-foreground mb-1">市区町村</label>
                              <input
                                id="recipientCity"
                                type="text"
                                value={recipientForm.city}
                                onChange={(e) => updateRecipientForm('city', e.target.value)}
                                placeholder="千代田区"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="recipientAddressLine" className="block text-sm font-medium text-foreground mb-1">番地・建物名</label>
                              <input
                                id="recipientAddressLine"
                                type="text"
                                value={recipientForm.addressLine}
                                onChange={(e) => updateRecipientForm('addressLine', e.target.value)}
                                placeholder="千代田1-1 〇〇ビル 101号室"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Shipping Address */}
              <section className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Truck className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">配送先情報</h2>
                </div>

                {state.isLoadingAddresses ? (
                  <div className="mb-4 pb-4 border-b border-border flex items-center gap-2 text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>保存済み配送先を読み込み中...</span>
                  </div>
                ) : savedAddresses.length > 0 ? (
                  <div className="mb-4 pb-4 border-b border-border">
                    <label className="block text-sm font-medium text-foreground mb-2">保存済み配送先から選択</label>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applySavedAddress(addr)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                        >
                          {addr.label}（{addr.lastName}{addr.firstName}）
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">姓</label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      placeholder="山田"
                      className={getFieldInputClass('lastName')}
                      aria-invalid={Boolean(getFieldError('lastName'))}
                      aria-describedby={getFieldError('lastName') ? 'lastName-error' : undefined}
                    />
                    {getFieldError('lastName') && (
                      <p id="lastName-error" className="mt-1 text-xs text-sale">{getFieldError('lastName')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">名</label>
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      placeholder="太郎"
                      className={getFieldInputClass('firstName')}
                      aria-invalid={Boolean(getFieldError('firstName'))}
                      aria-describedby={getFieldError('firstName') ? 'firstName-error' : undefined}
                    />
                    {getFieldError('firstName') && (
                      <p id="firstName-error" className="mt-1 text-xs text-sale">{getFieldError('firstName')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">メールアドレス</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      placeholder="example@email.com"
                      className={getFieldInputClass('email')}
                      aria-invalid={Boolean(getFieldError('email'))}
                      aria-describedby={getFieldError('email') ? 'email-error' : undefined}
                    />
                    {getFieldError('email') && (
                      <p id="email-error" className="mt-1 text-xs text-sale">{getFieldError('email')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">電話番号</label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="090-1234-5678"
                      className={getFieldInputClass('phone')}
                      aria-invalid={Boolean(getFieldError('phone'))}
                      aria-describedby={getFieldError('phone') ? 'phone-error' : undefined}
                    />
                    {getFieldError('phone') && (
                      <p id="phone-error" className="mt-1 text-xs text-sale">{getFieldError('phone')}</p>
                    )}
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
                      className={getFieldInputClass('postalCode')}
                      aria-invalid={Boolean(getFieldError('postalCode'))}
                      aria-describedby={getFieldError('postalCode') ? 'postalCode-error' : undefined}
                    />
                    {getFieldError('postalCode') && (
                      <p id="postalCode-error" className="mt-1 text-xs text-sale">{getFieldError('postalCode')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="prefecture" className="block text-sm font-medium text-foreground mb-1">都道府県</label>
                    <select
                      id="prefecture"
                      value={form.prefecture}
                      onChange={(e) => updateForm('prefecture', e.target.value)}
                      className={getFieldInputClass('prefecture')}
                      aria-invalid={Boolean(getFieldError('prefecture'))}
                      aria-describedby={getFieldError('prefecture') ? 'prefecture-error' : undefined}
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map((pref) => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                    {getFieldError('prefecture') && (
                      <p id="prefecture-error" className="mt-1 text-xs text-sale">{getFieldError('prefecture')}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">市区町村</label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="千代田区"
                      className={getFieldInputClass('city')}
                      aria-invalid={Boolean(getFieldError('city'))}
                      aria-describedby={getFieldError('city') ? 'city-error' : undefined}
                    />
                    {getFieldError('city') && (
                      <p id="city-error" className="mt-1 text-xs text-sale">{getFieldError('city')}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="addressLine" className="block text-sm font-medium text-foreground mb-1">番地・建物名</label>
                    <input
                      id="addressLine"
                      type="text"
                      value={form.addressLine}
                      onChange={(e) => updateForm('addressLine', e.target.value)}
                      placeholder="千代田1-1 〇〇ビル 101号室"
                      className={getFieldInputClass('addressLine')}
                      aria-invalid={Boolean(getFieldError('addressLine'))}
                      aria-describedby={getFieldError('addressLine') ? 'addressLine-error' : undefined}
                    />
                    {getFieldError('addressLine') && (
                      <p id="addressLine-error" className="mt-1 text-xs text-sale">{getFieldError('addressLine')}</p>
                    )}
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
                  <div>
                    <p className="text-sale text-sm">{squareError}</p>
                    <button onClick={retry} className="text-blue-600 hover:underline text-sm mt-2">
                      再試行
                    </button>
                  </div>
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
                  {wrappingPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">ギフトラッピング</span>
                      <span className="text-foreground">¥{wrappingPrice.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mb-6">
                  <span className="font-semibold text-foreground">合計（税込）</span>
                  <span className="text-xl font-bold text-primary">¥{total.toLocaleString()}</span>
                </div>

                {state.error && (
                  <div className="mb-4 p-3 bg-sale/10 border border-sale/20 rounded-lg text-sm text-sale">
                    {state.error}
                  </div>
                )}

                <StyledButton
                  type="submit"
                  className="w-full mb-4"
                  size="lg"
                  disabled={state.isProcessing || !state.cardAttached}
                >
                  {state.isProcessing ? (
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
