import type { SavedAddressItem } from '../api';
import type { ShippingAddress } from '../types';

/**
 * SavedAddressItem を ShippingAddress に変換
 *
 * @param savedAddress - 保存済み住所
 * @returns 配送先フォーム用の住所オブジェクト
 */
export function convertSavedAddressToShippingForm(
  savedAddress: SavedAddressItem
): ShippingAddress {
  return {
    lastName: savedAddress.lastName,
    firstName: savedAddress.firstName,
    email: savedAddress.email,
    phone: savedAddress.phone,
    postalCode: savedAddress.postalCode,
    prefecture: savedAddress.prefecture,
    city: savedAddress.city,
    addressLine: savedAddress.addressLine,
  };
}
