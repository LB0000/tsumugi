import { Gift } from 'lucide-react';
import { giftWrappingOptions, noshiTypes } from '../../data/giftOptions';
import type { ShippingAddress } from '../../types';
import { PREFECTURES } from './constants';
import type { ShippingField } from './validation';

type GiftOptionsValue = {
  isGift: boolean;
  wrappingId: string | null;
  noshiType: string | null;
  messageCard: string;
};

interface Props {
  giftOptions: GiftOptionsValue | null;
  setGiftOptions: (options: GiftOptionsValue | null) => void;
  clearGiftOptions: () => void;
  differentRecipient: boolean;
  setDifferentRecipient: (value: boolean) => void;
  recipientForm: ShippingAddress;
  updateRecipientForm: (field: ShippingField, value: string) => void;
  getRecipientFieldInputClass: (field: ShippingField) => string;
  getRecipientFieldError: (field: ShippingField) => string | null;
}

export function GiftOptionsSection({
  giftOptions,
  setGiftOptions,
  clearGiftOptions,
  differentRecipient,
  setDifferentRecipient,
  recipientForm,
  updateRecipientForm,
  getRecipientFieldInputClass,
  getRecipientFieldError,
}: Props) {
  const activeGiftOptions = giftOptions?.isGift ? giftOptions : null;

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg text-foreground">ギフトオプション</h2>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={activeGiftOptions?.isGift ?? false}
            onChange={(event) => {
              if (event.target.checked) {
                setGiftOptions({
                  isGift: true,
                  wrappingId: 'standard',
                  noshiType: null,
                  messageCard: '',
                });
                return;
              }
              clearGiftOptions();
              setDifferentRecipient(false);
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          <span className="ml-2 text-sm text-foreground">ギフトとして購入する</span>
        </label>
      </div>

      {activeGiftOptions && (
        <div className="space-y-5 pt-2 border-t border-border mt-2">
          <div className="pt-4">
            <label className="block text-sm font-medium text-foreground mb-3">ラッピング選択</label>
            <div className="space-y-2">
              {giftWrappingOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeGiftOptions.wrappingId === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="wrapping"
                    value={option.id}
                    checked={activeGiftOptions.wrappingId === option.id}
                    onChange={() => {
                      setGiftOptions({
                        ...activeGiftOptions,
                        wrappingId: option.id,
                        noshiType: option.id === 'noshi'
                          ? activeGiftOptions.noshiType ?? 'oiwai'
                          : null,
                      });
                    }}
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

          {activeGiftOptions.wrappingId === 'noshi' && (
            <div>
              <label htmlFor="noshiType" className="block text-sm font-medium text-foreground mb-1">のし紙の表書き</label>
              <select
                id="noshiType"
                value={activeGiftOptions.noshiType ?? 'oiwai'}
                onChange={(event) => setGiftOptions({ ...activeGiftOptions, noshiType: event.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {noshiTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="messageCard" className="block text-sm font-medium text-foreground mb-1">メッセージカード</label>
            <textarea
              id="messageCard"
              value={activeGiftOptions.messageCard}
              onChange={(event) => {
                if (event.target.value.length <= 200) {
                  setGiftOptions({ ...activeGiftOptions, messageCard: event.target.value });
                }
              }}
              placeholder="お祝いのメッセージを入力してください（任意）"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted text-right mt-1">{activeGiftOptions.messageCard.length}/200</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={differentRecipient}
                onChange={(event) => setDifferentRecipient(event.target.checked)}
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
                      autoComplete="shipping family-name"
                      value={recipientForm.lastName}
                      onChange={(event) => updateRecipientForm('lastName', event.target.value)}
                      placeholder="山田"
                      className={getRecipientFieldInputClass('lastName')}
                      aria-invalid={Boolean(getRecipientFieldError('lastName'))}
                      aria-describedby={getRecipientFieldError('lastName') ? 'recipientLastName-error' : undefined}
                    />
                    {getRecipientFieldError('lastName') && (
                      <p id="recipientLastName-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('lastName')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="recipientFirstName" className="block text-sm font-medium text-foreground mb-1">名</label>
                    <input
                      id="recipientFirstName"
                      type="text"
                      autoComplete="shipping given-name"
                      value={recipientForm.firstName}
                      onChange={(event) => updateRecipientForm('firstName', event.target.value)}
                      placeholder="太郎"
                      className={getRecipientFieldInputClass('firstName')}
                      aria-invalid={Boolean(getRecipientFieldError('firstName'))}
                      aria-describedby={getRecipientFieldError('firstName') ? 'recipientFirstName-error' : undefined}
                    />
                    {getRecipientFieldError('firstName') && (
                      <p id="recipientFirstName-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('firstName')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="recipientEmail" className="block text-sm font-medium text-foreground mb-1">メールアドレス</label>
                    <input
                      id="recipientEmail"
                      type="email"
                      autoComplete="section-recipient email"
                      value={recipientForm.email}
                      onChange={(event) => updateRecipientForm('email', event.target.value)}
                      placeholder="example@email.com"
                      className={getRecipientFieldInputClass('email')}
                      aria-invalid={Boolean(getRecipientFieldError('email'))}
                      aria-describedby={getRecipientFieldError('email') ? 'recipientEmail-error' : undefined}
                    />
                    {getRecipientFieldError('email') && (
                      <p id="recipientEmail-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('email')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="recipientPhone" className="block text-sm font-medium text-foreground mb-1">電話番号</label>
                    <input
                      id="recipientPhone"
                      type="tel"
                      autoComplete="section-recipient tel"
                      value={recipientForm.phone}
                      onChange={(event) => updateRecipientForm('phone', event.target.value)}
                      placeholder="090-1234-5678"
                      className={getRecipientFieldInputClass('phone')}
                      aria-invalid={Boolean(getRecipientFieldError('phone'))}
                      aria-describedby={getRecipientFieldError('phone') ? 'recipientPhone-error' : undefined}
                    />
                    {getRecipientFieldError('phone') && (
                      <p id="recipientPhone-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('phone')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="recipientPostalCode" className="block text-sm font-medium text-foreground mb-1">郵便番号</label>
                    <input
                      id="recipientPostalCode"
                      type="text"
                      autoComplete="shipping postal-code"
                      value={recipientForm.postalCode}
                      onChange={(event) => updateRecipientForm('postalCode', event.target.value)}
                      placeholder="100-0001"
                      maxLength={8}
                      className={getRecipientFieldInputClass('postalCode')}
                      aria-invalid={Boolean(getRecipientFieldError('postalCode'))}
                      aria-describedby={getRecipientFieldError('postalCode') ? 'recipientPostalCode-error' : undefined}
                    />
                    {getRecipientFieldError('postalCode') && (
                      <p id="recipientPostalCode-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('postalCode')}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="recipientPrefecture" className="block text-sm font-medium text-foreground mb-1">都道府県</label>
                    <select
                      id="recipientPrefecture"
                      autoComplete="shipping address-level1"
                      value={recipientForm.prefecture}
                      onChange={(event) => updateRecipientForm('prefecture', event.target.value)}
                      className={getRecipientFieldInputClass('prefecture')}
                      aria-invalid={Boolean(getRecipientFieldError('prefecture'))}
                      aria-describedby={getRecipientFieldError('prefecture') ? 'recipientPrefecture-error' : undefined}
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map((prefecture) => (
                        <option key={prefecture} value={prefecture}>{prefecture}</option>
                      ))}
                    </select>
                    {getRecipientFieldError('prefecture') && (
                      <p id="recipientPrefecture-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('prefecture')}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="recipientCity" className="block text-sm font-medium text-foreground mb-1">市区町村</label>
                    <input
                      id="recipientCity"
                      type="text"
                      autoComplete="shipping address-level2"
                      value={recipientForm.city}
                      onChange={(event) => updateRecipientForm('city', event.target.value)}
                      placeholder="千代田区"
                      className={getRecipientFieldInputClass('city')}
                      aria-invalid={Boolean(getRecipientFieldError('city'))}
                      aria-describedby={getRecipientFieldError('city') ? 'recipientCity-error' : undefined}
                    />
                    {getRecipientFieldError('city') && (
                      <p id="recipientCity-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('city')}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="recipientAddressLine" className="block text-sm font-medium text-foreground mb-1">番地・建物名</label>
                    <input
                      id="recipientAddressLine"
                      type="text"
                      autoComplete="shipping street-address"
                      value={recipientForm.addressLine}
                      onChange={(event) => updateRecipientForm('addressLine', event.target.value)}
                      placeholder="千代田1-1 〇〇ビル 101号室"
                      className={getRecipientFieldInputClass('addressLine')}
                      aria-invalid={Boolean(getRecipientFieldError('addressLine'))}
                      aria-describedby={getRecipientFieldError('addressLine') ? 'recipientAddressLine-error' : undefined}
                    />
                    {getRecipientFieldError('addressLine') && (
                      <p id="recipientAddressLine-error" className="mt-1 text-xs text-sale">{getRecipientFieldError('addressLine')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
