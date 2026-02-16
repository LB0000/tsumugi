import { API_BASE, buildAuthPostHeaders, fetchWithTimeout } from './common';
import { isErrorResponse, isContactResponse, isSupportChatResponse } from './typeGuards';

export interface ContactRequest {
  reason: 'order' | 'product' | 'other';
  name: string;
  email: string;
  orderNumber?: string;
  message: string;
}

export interface ContactResponse {
  success: true;
  inquiryId: string;
  estimatedReplyBusinessDays: number;
}

export interface SupportChatRequest {
  message?: string;
  actionId?: string;
}

export interface SupportChatResponse {
  success: true;
  reply: string;
  suggestedNextActions: string[];
}

export async function submitContact(request: ContactRequest): Promise<ContactResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/contact`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'お問い合わせの送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isContactResponse(data)) {
    throw new Error('Invalid contact response format');
  }

  return data;
}

export async function sendSupportChat(request: SupportChatRequest): Promise<SupportChatResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/support/chat`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'サポートへの送信に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isSupportChatResponse(data)) {
    throw new Error('Invalid support response format');
  }

  return data;
}
