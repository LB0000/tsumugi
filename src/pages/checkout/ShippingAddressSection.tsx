import { Loader2, Truck } from 'lucide-react';
import type { SavedAddressItem } from '../../api';
import type { ShippingAddress } from '../../types';
import { PREFECTURES } from './constants';
import type { ShippingField } from './validation';

interface Props {
  isLoadingAddresses: boolean;
  savedAddresses: SavedAddressItem[];
  form: ShippingAddress;
  onApplySavedAddress: (address: SavedAddressItem) => void;
  onUpdateForm: (field: ShippingField, value: string) => void;
  getFieldInputClass: (field: ShippingField) => string;
  getFieldError: (field: ShippingField) => string | null;
  isPostalLookupLoading?: boolean;
}

export function ShippingAddressSection({
  isLoadingAddresses,
  savedAddresses,
  form,
  onApplySavedAddress,
  onUpdateForm,
  getFieldInputClass,
  getFieldError,
  isPostalLookupLoading,
}: Props) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <Truck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg text-foreground">配送先情報</h2>
      </div>

      {isLoadingAddresses ? (
        <div className="mb-4 pb-4 border-b border-border flex items-center gap-2 text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>保存済み配送先を読み込み中...</span>
        </div>
      ) : savedAddresses.length > 0 ? (
        <div className="mb-4 pb-4 border-b border-border">
          <label className="block text-sm font-medium text-foreground mb-2">保存済み配送先から選択</label>
          <div className="flex flex-wrap gap-2">
            {savedAddresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => onApplySavedAddress(address)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              >
                {address.label}（{address.lastName}{address.firstName}）
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
            onChange={(event) => onUpdateForm('lastName', event.target.value)}
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
            onChange={(event) => onUpdateForm('firstName', event.target.value)}
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
            onChange={(event) => onUpdateForm('email', event.target.value)}
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
            onChange={(event) => onUpdateForm('phone', event.target.value)}
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
          <div className="relative">
            <input
              id="postalCode"
              type="text"
              value={form.postalCode}
              onChange={(event) => onUpdateForm('postalCode', event.target.value)}
              placeholder="100-0001"
              maxLength={8}
              className={getFieldInputClass('postalCode')}
              aria-invalid={Boolean(getFieldError('postalCode'))}
              aria-describedby={getFieldError('postalCode') ? 'postalCode-error' : undefined}
            />
            {isPostalLookupLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          {getFieldError('postalCode') && (
            <p id="postalCode-error" className="mt-1 text-xs text-sale">{getFieldError('postalCode')}</p>
          )}
        </div>
        <div>
          <label htmlFor="prefecture" className="block text-sm font-medium text-foreground mb-1">都道府県</label>
          <select
            id="prefecture"
            value={form.prefecture}
            onChange={(event) => onUpdateForm('prefecture', event.target.value)}
            className={getFieldInputClass('prefecture')}
            aria-invalid={Boolean(getFieldError('prefecture'))}
            aria-describedby={getFieldError('prefecture') ? 'prefecture-error' : undefined}
          >
            <option value="">選択してください</option>
            {PREFECTURES.map((prefecture) => (
              <option key={prefecture} value={prefecture}>{prefecture}</option>
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
            onChange={(event) => onUpdateForm('city', event.target.value)}
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
            onChange={(event) => onUpdateForm('addressLine', event.target.value)}
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
  );
}
