import type { ShippingAddress } from '../types';
import { API_BASE, buildAuthPostHeaders, fetchWithTimeout } from './common';
import { isErrorResponse, isCreateOrderResponse, isProcessPaymentResponse, isOrdersResponse, isOrderDetailResponse } from './typeGuards';

export interface GiftOptionsPayload {
  isGift: boolean;
  wrappingId?: string;
  noshiType?: string;
  messageCard?: string;
  recipientAddress?: ShippingAddress;
}

export interface CreateOrderRequest {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  clientRequestId?: string;
  giftOptions?: GiftOptionsPayload;
}

export interface CreateOrderResponse {
  success: true;
  orderId: string;
  totalAmount: number;
}

export interface ProcessPaymentRequest {
  sourceId: string;
  orderId: string;
  buyerEmail: string;
  clientRequestId?: string;
}

export interface ProcessPaymentResponse {
  success: true;
  paymentId: string;
  orderId: string;
  status: string;
  receiptUrl?: string;
}

export interface OrderItemDetail {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderShippingAddress {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
}

export interface OrderHistoryItem {
  orderId: string;
  paymentId: string;
  status: string;
  totalAmount?: number;
  createdAt?: string;
  updatedAt: string;
  items?: OrderItemDetail[];
  shippingAddress?: OrderShippingAddress;
  receiptUrl?: string;
}

export interface OrdersResponse {
  success: true;
  orders: OrderHistoryItem[];
}

export interface OrderDetailResponse {
  success: true;
  order: OrderHistoryItem;
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/checkout/create-order`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '注文の作成に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreateOrderResponse(data)) {
    throw new Error('Invalid create-order response format');
  }

  return data;
}

export async function processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/checkout/process-payment`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '決済処理に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isProcessPaymentResponse(data)) {
    throw new Error('Invalid payment response format');
  }

  return data;
}

export async function getOrders(): Promise<OrderHistoryItem[]> {
  const response = await fetchWithTimeout(`${API_BASE}/checkout/orders`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '注文履歴の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isOrdersResponse(data)) {
    throw new Error('Invalid orders response format');
  }

  return data.orders;
}

export async function getOrderDetail(orderId: string): Promise<OrderHistoryItem> {
  const response = await fetchWithTimeout(`${API_BASE}/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();
  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '注文詳細の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isOrderDetailResponse(data)) {
    throw new Error('Invalid order detail response format');
  }

  return data.order;
}
