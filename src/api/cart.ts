import { API_BASE, fetchWithTimeout, buildAuthPostHeaders } from './common';
import { isErrorResponse } from './typeGuards';

export interface CartSaveItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CartRestoreResponse {
  success: boolean;
  items: CartSaveItem[];
}

export async function saveCart(items: CartSaveItem[]): Promise<void> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/cart/save`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ items }),
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'カートの保存に失敗しました';
    throw new Error(errorMessage);
  }
}

function isCartRestoreResponse(data: unknown): data is CartRestoreResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.success !== 'boolean' || !Array.isArray(obj.items)) return false;
  return obj.items.every(
    (item: unknown) =>
      typeof item === 'object' && item !== null &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).price === 'number' &&
      typeof (item as Record<string, unknown>).quantity === 'number'
  );
}

export async function restoreCart(): Promise<CartRestoreResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/cart/restore`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'カートの復元に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCartRestoreResponse(data)) {
    throw new Error('カートの復元に失敗しました');
  }

  return data;
}
