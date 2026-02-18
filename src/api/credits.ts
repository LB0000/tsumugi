/**
 * Credits API client
 * Handles credit balance queries, purchases, and transaction history
 */

import { API_BASE, buildAuthPostHeaders, fetchWithTimeout } from './common';
import { isErrorResponse } from './typeGuards';

// ==================== Response Types ====================

export interface CreditsResponse {
  success: true;
  credits: {
    freeRemaining: number;
    paidRemaining: number;
    totalRemaining: number;
    totalUsed: number;
  };
}

export interface CreditsPricingResponse {
  success: true;
  pricing: {
    freeCredits: number;
    packCredits: number;
    packPriceYen: number;
    pricePerGeneration: number;
  };
}

export interface CreditTransactionItem {
  id: string;
  type: 'grant_free' | 'purchase' | 'consume' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
  referenceId?: string;
}

export interface CreditsTransactionsResponse {
  success: true;
  transactions: CreditTransactionItem[];
}

export interface CreditsPurchaseResponse {
  success: true;
  paymentId: string;
  status: string;
  creditsAdded: number;
  creditsRemaining: number;
}

// ==================== Type Guards ====================

export function isCreditsResponse(data: unknown): data is CreditsResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (obj.success !== true || typeof obj.credits !== 'object' || obj.credits === null) return false;
  const credits = obj.credits as Record<string, unknown>;
  return (
    typeof credits.freeRemaining === 'number' &&
    typeof credits.paidRemaining === 'number' &&
    typeof credits.totalRemaining === 'number' &&
    typeof credits.totalUsed === 'number'
  );
}

export function isCreditsPricingResponse(data: unknown): data is CreditsPricingResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (obj.success !== true || typeof obj.pricing !== 'object' || obj.pricing === null) return false;
  const pricing = obj.pricing as Record<string, unknown>;
  return (
    typeof pricing.freeCredits === 'number' &&
    typeof pricing.packCredits === 'number' &&
    typeof pricing.packPriceYen === 'number' &&
    typeof pricing.pricePerGeneration === 'number'
  );
}

export function isCreditsPurchaseResponse(data: unknown): data is CreditsPurchaseResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.success === true &&
    typeof obj.paymentId === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.creditsAdded === 'number' &&
    typeof obj.creditsRemaining === 'number'
  );
}

export function isCreditsTransactionsResponse(data: unknown): data is CreditsTransactionsResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.success === true && Array.isArray(obj.transactions);
}

// ==================== API Functions ====================

/**
 * Get current user's credit balance
 * Requires authentication
 */
export async function getCredits(): Promise<CreditsResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/credits`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : 'クレジット情報の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreditsResponse(data)) {
    throw new Error('Invalid credits response format');
  }

  return data;
}

/**
 * Get pricing information (no auth required)
 */
export async function getCreditsPricing(): Promise<CreditsPricingResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/credits/pricing`, {
    method: 'GET',
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '価格情報の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreditsPricingResponse(data)) {
    throw new Error('Invalid pricing response format');
  }

  return data;
}

/**
 * Purchase credits via Square payment
 * Requires authentication
 * @param sourceId - Square Web Payments SDK source ID (card nonce)
 * @param credits - Number of credits to purchase (default: 10)
 */
export async function purchaseCredits(
  sourceId: string,
  credits: number = 10,
): Promise<CreditsPurchaseResponse> {
  const headers = await buildAuthPostHeaders();
  const response = await fetchWithTimeout(`${API_BASE}/credits/purchase`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ sourceId, credits }),
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '決済処理に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreditsPurchaseResponse(data)) {
    throw new Error('Invalid purchase response format');
  }

  return data;
}

/**
 * Get current user's transaction history
 * Requires authentication
 */
export async function getCreditsTransactions(): Promise<CreditsTransactionsResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/credits/transactions`, {
    method: 'GET',
    credentials: 'include',
  });

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data) ? data.error.message : '取引履歴の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isCreditsTransactionsResponse(data)) {
    throw new Error('Invalid transactions response format');
  }

  return data;
}
