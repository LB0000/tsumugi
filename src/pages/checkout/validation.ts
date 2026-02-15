import type { ShippingAddress } from '../../types';

export type ShippingField = keyof ShippingAddress;
export type ShippingFieldErrors = Partial<Record<ShippingField, string>>;

export const SHIPPING_FIELD_ORDER: ShippingField[] = [
  'lastName',
  'firstName',
  'email',
  'phone',
  'postalCode',
  'prefecture',
  'city',
  'addressLine',
];

const POSTAL_CODE_RE = /^\d{3}-?\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredError(label: string, value: string): string | null {
  if (value.trim().length > 0) return null;
  return `${label}を入力してください`;
}

export function validateShippingField(field: ShippingField, value: string): string | null {
  const trimmed = value.trim();
  switch (field) {
    case 'lastName':
      return requiredError('姓', trimmed);
    case 'firstName':
      return requiredError('名', trimmed);
    case 'email': {
      const required = requiredError('メールアドレス', trimmed);
      if (required) return required;
      if (!EMAIL_RE.test(trimmed)) return '有効なメールアドレスを入力してください';
      return null;
    }
    case 'phone':
      return requiredError('電話番号', trimmed);
    case 'postalCode': {
      const required = requiredError('郵便番号', trimmed);
      if (required) return required;
      if (!POSTAL_CODE_RE.test(trimmed)) return '正しい郵便番号を入力してください（例: 100-0001）';
      return null;
    }
    case 'prefecture':
      return requiredError('都道府県', trimmed);
    case 'city':
      return requiredError('市区町村', trimmed);
    case 'addressLine':
      return requiredError('番地・建物名', trimmed);
    default:
      return null;
  }
}

export function validateShippingForm(form: ShippingAddress): ShippingFieldErrors {
  const errors: ShippingFieldErrors = {};
  for (const field of SHIPPING_FIELD_ORDER) {
    const message = validateShippingField(field, form[field] ?? '');
    if (message) errors[field] = message;
  }
  return errors;
}

export function getFirstShippingError(errors: ShippingFieldErrors): string | null {
  for (const field of SHIPPING_FIELD_ORDER) {
    const message = errors[field];
    if (message) return message;
  }
  return null;
}
