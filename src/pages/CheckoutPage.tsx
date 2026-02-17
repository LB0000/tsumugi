import { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Breadcrumb } from '../components/common';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { useSquarePayments } from '../hooks/useSquarePayments';
import { createOrder, processPayment, getAddresses } from '../api';
import type { SavedAddressItem } from '../api';
import type { ShippingAddress } from '../types';
import { trackEvent, trackMetaInitiateCheckout } from '../lib/analytics';
import {
  validateShippingField,
  validateShippingForm,
  getFirstShippingError,
  SHIPPING_FIELD_ORDER,
  type ShippingField,
  type ShippingFieldErrors,
} from './checkout/validation';
import { GiftOptionsSection } from './checkout/GiftOptionsSection';
import { ShippingAddressSection } from './checkout/ShippingAddressSection';
import { PaymentSection } from './checkout/PaymentSection';
import { OrderSummaryCard } from './checkout/OrderSummaryCard';

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
  const [recipientFieldErrors, setRecipientFieldErrors] = useState<ShippingFieldErrors>({});
  const [recipientTouchedFields, setRecipientTouchedFields] = useState<Partial<Record<ShippingField, boolean>>>({});

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
    const shipping = subtotal >= 5000 ? 0 : 500;
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
    if (cartItems.length === 0) {
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

  useEffect(() => {
    if (differentRecipient) return;
    setRecipientTouchedFields({});
    setRecipientFieldErrors({});
  }, [differentRecipient]);

  useEffect(() => {
    if (!authUser) return;
    dispatch({ type: 'LOADING_ADDRESSES' });
    void getAddresses()
      .then((addresses) => {
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((address) => address.isDefault) ?? (addresses.length === 1 ? addresses[0] : null);
        if (defaultAddress && !formTouchedRef.current) {
          setForm({
            lastName: defaultAddress.lastName,
            firstName: defaultAddress.firstName,
            email: defaultAddress.email,
            phone: defaultAddress.phone,
            postalCode: defaultAddress.postalCode,
            prefecture: defaultAddress.prefecture,
            city: defaultAddress.city,
            addressLine: defaultAddress.addressLine,
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

  const applySavedAddress = (address: SavedAddressItem) => {
    formTouchedRef.current = true;
    setForm({
      lastName: address.lastName,
      firstName: address.firstName,
      email: address.email,
      phone: address.phone,
      postalCode: address.postalCode,
      prefecture: address.prefecture,
      city: address.city,
      addressLine: address.addressLine,
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

  const updateRecipientForm = (field: ShippingField, value: string) => {
    setRecipientTouchedFields((prev) => ({ ...prev, [field]: true }));
    setRecipientForm((prev) => ({ ...prev, [field]: value }));
    const message = validateShippingField(field, value);
    setRecipientFieldErrors((prevErrors) => ({ ...prevErrors, [field]: message ?? undefined }));
  };

  const touchAllFields = () => {
    const touched: Partial<Record<ShippingField, boolean>> = {};
    for (const field of SHIPPING_FIELD_ORDER) {
      touched[field] = true;
    }
    setTouchedFields(touched);
  };

  const touchAllRecipientFields = () => {
    const touched: Partial<Record<ShippingField, boolean>> = {};
    for (const field of SHIPPING_FIELD_ORDER) {
      touched[field] = true;
    }
    setRecipientTouchedFields(touched);
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

  const getRecipientFieldError = (field: ShippingField): string | null => {
    if (!recipientTouchedFields[field]) return null;
    return recipientFieldErrors[field] ?? null;
  };

  const getRecipientFieldInputClass = (field: ShippingField): string => {
    const hasError = Boolean(getRecipientFieldError(field));
    return `w-full px-3 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-sale focus:ring-sale/30'
        : 'border-border focus:ring-primary/50'
    }`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: 'SET_ERROR', payload: null });

    const errors = validateShippingForm(form);
    setFieldErrors(errors);
    touchAllFields();

    const validationError = getFirstShippingError(errors);
    if (validationError) {
      dispatch({ type: 'SET_ERROR', payload: `配送先情報: ${validationError}` });
      return;
    }

    if (differentRecipient) {
      const recipientErrors = validateShippingForm(recipientForm);
      setRecipientFieldErrors(recipientErrors);
      touchAllRecipientFields();
      const recipientValidationError = getFirstShippingError(recipientErrors);
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

      const paymentResponse = await processPayment({
        sourceId,
        orderId: orderResponse.orderId,
        buyerEmail: form.email,
        clientRequestId,
      });

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

              <GiftOptionsSection
                giftOptions={giftOptions}
                setGiftOptions={setGiftOptions}
                clearGiftOptions={clearGiftOptions}
                differentRecipient={differentRecipient}
                setDifferentRecipient={setDifferentRecipient}
                recipientForm={recipientForm}
                updateRecipientForm={updateRecipientForm}
                getRecipientFieldInputClass={getRecipientFieldInputClass}
                getRecipientFieldError={getRecipientFieldError}
              />

              <ShippingAddressSection
                isLoadingAddresses={state.isLoadingAddresses}
                savedAddresses={savedAddresses}
                form={form}
                onApplySavedAddress={applySavedAddress}
                onUpdateForm={updateForm}
                getFieldInputClass={getFieldInputClass}
                getFieldError={getFieldError}
              />

              <PaymentSection
                squareError={squareError}
                isReady={isReady}
                onRetry={retry}
              />
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
                cardAttached={state.cardAttached}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
