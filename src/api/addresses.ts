import { API_BASE, buildAuthPostHeaders, buildAuthActionHeaders, fetchWithTimeout } from './common';
import { isErrorResponse, isAddressesResponse, isAddressSaveResponse } from './typeGuards';

export interface SavedAddressItem {
  id: string;
  label: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressesResponse {
  success: true;
  addresses: SavedAddressItem[];
}

export interface AddressSaveResponse {
  success: true;
  address: SavedAddressItem;
}

export async function getAddresses(): Promise<SavedAddressItem[]> {
  const response = await fetchWithTimeout(`${API_BASE}/auth/addresses`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '配送先の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAddressesResponse(data)) {
    throw new Error('Invalid addresses response format');
  }

  return data.addresses;
}

export async function saveAddress(address: Omit<SavedAddressItem, 'id' | 'createdAt'>): Promise<SavedAddressItem> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/addresses`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(address),
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '配送先の保存に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isAddressSaveResponse(data)) {
    throw new Error('Invalid address save response format');
  }

  return data.address;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const headers = await buildAuthActionHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/auth/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '配送先の削除に失敗しました';
    throw new Error(errorMessage);
  }
}
