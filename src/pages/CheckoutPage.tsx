import { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, CreditCard, Gift, Loader2, Truck } from 'lucide-react';
import { Breadcrumb } from '../components/common';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { useSquarePayments } from '../hooks/useSquarePayments';
import { useShippingForm } from '../hooks/useShippingForm';
import { useCheckoutSections } from '../hooks/useCheckoutSections';
import { useSavedAddresses } from '../hooks/useSavedAddresses';
import { createOrder, processPayment } from '../api';
import type { SavedAddressItem } from '../api';
import { trackEvent, trackMetaInitiateCheckout } from '../lib/analytics';
import { PREVIEW_GENERATED_AT_KEY } from '../data/constants';
import { SHIPPING_FREE_THRESHOLD, SHIPPING_FLAT_FEE } from '../data/shipping';
import { GiftOptionsSection } from './checkout/GiftOptionsSection';
import { ShippingAddressSection } from './checkout/ShippingAddressSection';
import { PaymentSection } from './checkout/PaymentSection';
import { OrderSummaryCard } from './checkout/OrderSummaryCard';

type ProcessingStep = 'paying' | 'confirming' | null;

type CheckoutState = {
  isProcessing: boolean;
  processingStep: ProcessingStep;
  error: string | null;
  cardAttached: boolean;
  isLoadingAddresses: boolean;
};

type CheckoutAction =
  | { type: 'START_PROCESSING' }
  | { type: 'FINISH_PROCESSING' }
  | { type: 'SET_PROCESSING_STEP'; payload: ProcessingStep }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CARD_ATTACHED' }
  | { type: 'LOADING_ADDRESSES' }
  | { type: 'ADDRESSES_LOADED' };

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, processingStep: 'paying', error: null };
    case 'FINISH_PROCESSING':
      return { ...state, isProcessing: false, processingStep: null };
    case 'SET_PROCESSING_STEP':
      return { ...state, processingStep: action.payload };
    case 'SET_ERROR':
      return { ...state, isProcessing: false, processingStep: null, error: action.payload };
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
    processingStep: null,
    error: null,
    cardAttached: false,
    isLoadingAddresses: false,
  });
  const checkoutAttemptIdRef = useRef<string | null>(null);
  const formTouchedRef = useRef(false);
  const cardInitRef = useRef(false);
  const orderCompleteRef = useRef(false);

  const { giftOptions, setGiftOptions, clearGiftOptions } = useAppStore();
  const [differentRecipient, setDifferentRecipient] = useState(false);

  // カスタムフックで状態管理を簡素化
  const shippingForm = useShippingForm();
  const recipientForm = useShippingForm({ enabled: differentRecipient });
  const { activeSection } = useCheckoutSections();
  const { savedAddresses, isLoading: isLoadingAddresses, error: savedAddressesError, defaultAddress } = useSavedAddresses({
    authUser,
    formTouched: formTouchedRef.current,
  });

  // デフォルト住所を適用
  useEffect(() => {
    if (defaultAddress && !formTouchedRef.current) {
      shippingForm.setForm(defaultAddress);
    }
  }, [defaultAddress]); // shippingForm.setForm は安定しているので依存配列に不要

  // 保存済み住所のエラーを state に反映
  useEffect(() => {
    if (savedAddressesError) {
      dispatch({ type: 'SET_ERROR', payload: savedAddressesError });
    }
  }, [savedAddressesError]);

  const wrappingPrice = useMemo(() => {
    if (!giftOptions?.isGift || !giftOptions.wrappingId) return 0;
    switch (giftOptions.wrappingId) {
      case 'premium':
        return 500;
      case 'noshi':
        return 300;
      default:
        return 0;
    }
  }, [giftOptions]);

  const { subtotal, shipping, total } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_FEE;
    const total = subtotal + shipping + wrappingPrice;
    return { subtotal, shipping, total };
  }, [cartItems, wrappingPrice]);

  useEffect(() => {
    trackEvent('begin_checkout', { is_guest: !authUser });
    trackMetaInitiateCheckout({
      num_items: cartItems.length,
      value: total,
      currency: 'JPY',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && !orderCompleteRef.current) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  useEffect(() => {
    if (isReady && !state.cardAttached && !cardInitRef.current) {
      cardInitRef.current = true;
      attachCard('#card-container')
        .then(() => dispatch({ type: 'CARD_ATTACHED' }))
        .catch((error) => {
          cardInitRef.current = false;
          dispatch({
            type: 'SET_ERROR',
            payload: error instanceof Error ? error.message : 'カード入力の初期化に失敗しました',
          });
        });
    }
  }, [isReady, state.cardAttached, attachCard]);

  useEffect(() => {
    checkoutAttemptIdRef.current = null;
  }, [cartItems]);

  // 保存済み住所の読み込み状態を state に反映
  useEffect(() => {
    if (isLoadingAddresses) {
      dispatch({ type: 'LOADING_ADDRESSES' });
    } else {
      dispatch({ type: 'ADDRESSES_LOADED' });
    }
  }, [isLoadingAddresses]);

  const applySavedAddress = (address: SavedAddressItem) => {
    formTouchedRef.current = true;
    shippingForm.setForm({
      lastName: address.lastName,
      firstName: address.firstName,
      email: address.email,
      phone: address.phone,
      postalCode: address.postalCode,
      prefecture: address.prefecture,
      city: address.city,
      addressLine: address.addressLine,
    });
    shippingForm.clearTouchedAndErrors();
  };

  const updateForm: typeof shippingForm.updateField = (field, value) => {
    formTouchedRef.current = true;
    shippingForm.updateField(field, value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: 'SET_ERROR', payload: null });

    const validationError = shippingForm.validateForm();
    if (validationError) {
      dispatch({ type: 'SET_ERROR', payload: `配送先情報: ${validationError}` });
      return;
    }

    if (differentRecipient) {
      const recipientValidationError = recipientForm.validateForm();
      if (recipientValidationError) {
        dispatch({ type: 'SET_ERROR', payload: `ギフト送り先情報: ${recipientValidationError}` });
        return;
      }
    }

    dispatch({ type: 'START_PROCESSING' });

    try {
      const clientRequestId = checkoutAttemptIdRef.current ?? crypto.randomUUID();
      checkoutAttemptIdRef.current = clientRequestId;

      const sourceId = await tokenize();

      // TODO (Phase 6): imageData payload size can be 1-3MB per item (base64 JPEG)
      // Backend must configure body-parser limit (e.g., 10MB) or use multipart/form-data
      const generatedAtRaw = localStorage.getItem(PREVIEW_GENERATED_AT_KEY);
      const generatedAtNum = generatedAtRaw ? parseInt(generatedAtRaw, 10) : undefined;
      const validGeneratedAt = generatedAtNum && Number.isFinite(generatedAtNum) ? generatedAtNum : undefined;

      dispatch({ type: 'SET_PROCESSING_STEP', payload: 'confirming' });
      const orderResponse = await createOrder({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          imageData: item.imageUrl,  // Base64 image data (with text overlay if portraitName exists)
          options: item.options,  // Include options (e.g., portraitName)
        })),
        shippingAddress: shippingForm.form,
        clientRequestId,
        ...(validGeneratedAt && { generatedAt: validGeneratedAt }),
        ...(giftOptions?.isGift && {
          giftOptions: {
            isGift: true,
            wrappingId: giftOptions.wrappingId ?? undefined,
            noshiType: giftOptions.noshiType ?? undefined,
            messageCard: giftOptions.messageCard || undefined,
            ...(differentRecipient && { recipientAddress: recipientForm.form }),
          },
        }),
      });

      const paymentResponse = await processPayment({
        sourceId,
        orderId: orderResponse.orderId,
        buyerEmail: shippingForm.form.email,
        clientRequestId,
      });

      orderCompleteRef.current = true;
      clearCart();
      clearGiftOptions();
      checkoutAttemptIdRef.current = null;
      navigate('/order-confirmation', {
        state: {
          orderId: paymentResponse.orderId,
          paymentId: paymentResponse.paymentId,
          totalAmount: orderResponse.totalAmount,
          receiptUrl: paymentResponse.receiptUrl,
          shippingAddress: shippingForm.form,
        },
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '決済処理中にエラーが発生しました',
      });
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
        ]}
        />
      </div>

      <nav aria-label="チェックアウト手順" className="max-w-5xl mx-auto px-4 pt-6 pb-2 sticky top-16 z-10 bg-background/95 backdrop-blur-sm">
        <ol className="flex items-center justify-center gap-0">
          {([
            { id: 'gift', label: 'ギフト', icon: Gift },
            { id: 'shipping', label: '配送先', icon: Truck },
            { id: 'payment', label: 'お支払い', icon: CreditCard },
          ] as const).map((step, index) => {
            const sectionOrder = ['gift', 'shipping', 'payment'] as const;
            const activeIndex = sectionOrder.indexOf(activeSection);
            const stepIndex = sectionOrder.indexOf(step.id);
            const isActive = step.id === activeSection;
            const isCompleted = stepIndex < activeIndex;
            const Icon = isCompleted ? Check : step.icon;

            return (
              <li key={step.id} className="flex items-center">
                {index > 0 && (
                  <div className={`w-8 sm:w-12 h-px mx-1 ${isCompleted || isActive ? 'bg-primary' : 'bg-border'}`} />
                )}
                <button
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={step.label}
                  onClick={() => document.getElementById(step.id)?.scrollIntoView({ behavior: 'smooth' })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? 'text-primary font-semibold bg-primary/10'
                      : isCompleted
                        ? 'text-primary'
                        : 'text-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-8">お支払い</h1>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {!authUser && (
                <aside className="bg-accent-sage/10 border border-accent-sage/20 rounded-lg p-4 flex items-center justify-between" aria-label="ログインのご案内">
                  <div>
                    <p className="text-sm font-medium text-foreground">会員登録なしで購入できます</p>
                    <p className="text-xs text-muted">ログインすると保存済みの住所や注文履歴を利用できます</p>
                  </div>
                  <Link to="/login" state={{ returnTo: '/checkout' }} className="text-sm text-primary hover:underline font-medium shrink-0 ml-4">
                    ログイン
                  </Link>
                </aside>
              )}

              <div id="gift">
              <GiftOptionsSection
                giftOptions={giftOptions}
                setGiftOptions={setGiftOptions}
                clearGiftOptions={clearGiftOptions}
                differentRecipient={differentRecipient}
                setDifferentRecipient={setDifferentRecipient}
                recipientForm={recipientForm.form}
                updateRecipientForm={recipientForm.updateField}
                getRecipientFieldInputClass={recipientForm.getFieldInputClass}
                getRecipientFieldError={recipientForm.getFieldError}
              />
              </div>

              <div id="shipping">
              <ShippingAddressSection
                isLoadingAddresses={state.isLoadingAddresses}
                savedAddresses={savedAddresses}
                form={shippingForm.form}
                onApplySavedAddress={applySavedAddress}
                onUpdateForm={updateForm}
                getFieldInputClass={shippingForm.getFieldInputClass}
                getFieldError={shippingForm.getFieldError}
                isPostalLookupLoading={shippingForm.isPostalLookupLoading}
              />
              </div>

              <div id="payment">
              <PaymentSection
                squareError={squareError}
                isReady={isReady}
                onRetry={retry}
              />
              </div>
            </div>

            <div className="lg:col-span-1">
              <OrderSummaryCard
                cartItems={cartItems}
                subtotal={subtotal}
                shipping={shipping}
                wrappingPrice={wrappingPrice}
                total={total}
                error={state.error}
                isProcessing={state.isProcessing}
                processingStep={state.processingStep}
                cardAttached={state.cardAttached}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
