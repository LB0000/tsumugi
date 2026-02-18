import { useState, useEffect, useRef } from 'react';
import { usePostalCodeLookup } from './usePostalCodeLookup';
import {
  validateShippingField,
  validateShippingForm,
  getFirstShippingError,
  SHIPPING_FIELD_ORDER,
  type ShippingField,
  type ShippingFieldErrors,
} from '../pages/checkout/validation';
import type { ShippingAddress } from '../types';

export interface UseShippingFormOptions {
  /** フォームが有効かどうか（例: differentRecipient が false の場合は無効） */
  enabled?: boolean;
}

export interface UseShippingFormResult {
  /** フォーム状態 */
  form: ShippingAddress;
  /** フォームを設定 */
  setForm: React.Dispatch<React.SetStateAction<ShippingAddress>>;
  /** フィールドエラー */
  fieldErrors: ShippingFieldErrors;
  /** タッチされたフィールド */
  touchedFields: Partial<Record<ShippingField, boolean>>;
  /** フィールド更新 */
  updateField: (field: ShippingField, value: string) => void;
  /** 全フィールドをタッチ済みにする */
  touchAllFields: () => void;
  /** フィールドエラーを取得 */
  getFieldError: (field: ShippingField) => string | null;
  /** フィールド用の CSS クラスを取得 */
  getFieldInputClass: (field: ShippingField) => string;
  /** フォーム全体をバリデート */
  validateForm: () => string | null;
  /** タッチ状態とエラーをクリア */
  clearTouchedAndErrors: () => void;
  /** 郵便番号ルックアップのローディング状態 */
  isPostalLookupLoading: boolean;
}

/**
 * 配送先フォームの状態管理とバリデーションを提供するカスタムフック
 *
 * 機能:
 * - フォーム状態管理
 * - フィールドバリデーション
 * - 郵便番号自動入力
 * - タッチ状態管理
 */
export function useShippingForm(options: UseShippingFormOptions = {}): UseShippingFormResult {
  const { enabled = true } = options;

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

  // 郵便番号自動入力
  const postalLookup = usePostalCodeLookup(form.postalCode);
  const postalAppliedRef = useRef('');

  useEffect(() => {
    if (!enabled) return;

    const digits = form.postalCode.replace(/-/g, '');
    if (postalLookup.prefecture && postalAppliedRef.current !== digits) {
      postalAppliedRef.current = digits;
      setForm((prev) => ({
        ...prev,
        prefecture: postalLookup.prefecture,
        city: postalLookup.city,
        addressLine: prev.addressLine || postalLookup.town,
      }));
    }
  }, [postalLookup.prefecture, postalLookup.city, postalLookup.town, form.postalCode, enabled]);

  // enabled が false になったらクリア
  useEffect(() => {
    if (!enabled) {
      setTouchedFields({});
      setFieldErrors({});
    }
  }, [enabled]);

  const updateField = (field: ShippingField, value: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    setForm((prev) => ({ ...prev, [field]: value }));
    const message = validateShippingField(field, value);
    setFieldErrors((prevErrors) => ({ ...prevErrors, [field]: message ?? undefined }));
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

  const validateForm = (): string | null => {
    const errors = validateShippingForm(form);
    setFieldErrors(errors);
    touchAllFields();
    return getFirstShippingError(errors);
  };

  const clearTouchedAndErrors = () => {
    setTouchedFields({});
    setFieldErrors({});
  };

  return {
    form,
    setForm,
    fieldErrors,
    touchedFields,
    updateField,
    touchAllFields,
    getFieldError,
    getFieldInputClass,
    validateForm,
    clearTouchedAndErrors,
    isPostalLookupLoading: postalLookup.isLoading,
  };
}
