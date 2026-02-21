// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { convertSavedAddressToShippingForm } from '../../utils/addressMapping';
import type { SavedAddressItem } from '../../api';
import type { ShippingAddress } from '../../types';

const makeSavedAddress = (overrides?: Partial<SavedAddressItem>): SavedAddressItem => ({
  id: 'addr-1',
  label: '自宅',
  lastName: '山田',
  firstName: '太郎',
  email: 'taro@example.com',
  phone: '090-1234-5678',
  postalCode: '100-0001',
  prefecture: '東京都',
  city: '千代田区',
  addressLine: '千代田1-1-1',
  isDefault: true,
  createdAt: '2025-01-15T00:00:00Z',
  ...overrides,
});

describe('convertSavedAddressToShippingForm', () => {
  it('converts a SavedAddressItem to ShippingAddress', () => {
    const saved = makeSavedAddress();
    const result = convertSavedAddressToShippingForm(saved);

    const expected: ShippingAddress = {
      lastName: '山田',
      firstName: '太郎',
      email: 'taro@example.com',
      phone: '090-1234-5678',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      addressLine: '千代田1-1-1',
    };

    expect(result).toEqual(expected);
  });

  it('does not include id, label, isDefault, or createdAt in the result', () => {
    const saved = makeSavedAddress();
    const result = convertSavedAddressToShippingForm(saved);

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('label');
    expect(result).not.toHaveProperty('isDefault');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('preserves empty string fields', () => {
    const saved = makeSavedAddress({
      email: '',
      phone: '',
      addressLine: '',
    });
    const result = convertSavedAddressToShippingForm(saved);

    expect(result.email).toBe('');
    expect(result.phone).toBe('');
    expect(result.addressLine).toBe('');
  });

  it('maps all eight ShippingAddress fields correctly', () => {
    const saved = makeSavedAddress();
    const result = convertSavedAddressToShippingForm(saved);

    const keys = Object.keys(result);
    expect(keys).toHaveLength(8);
    expect(keys).toContain('lastName');
    expect(keys).toContain('firstName');
    expect(keys).toContain('email');
    expect(keys).toContain('phone');
    expect(keys).toContain('postalCode');
    expect(keys).toContain('prefecture');
    expect(keys).toContain('city');
    expect(keys).toContain('addressLine');
  });

  it('handles different address data correctly', () => {
    const saved = makeSavedAddress({
      lastName: '佐藤',
      firstName: '花子',
      email: 'hanako@example.com',
      phone: '080-9876-5432',
      postalCode: '540-0002',
      prefecture: '大阪府',
      city: '大阪市中央区',
      addressLine: '大阪城1-1',
    });
    const result = convertSavedAddressToShippingForm(saved);

    expect(result.lastName).toBe('佐藤');
    expect(result.firstName).toBe('花子');
    expect(result.prefecture).toBe('大阪府');
    expect(result.city).toBe('大阪市中央区');
  });
});
