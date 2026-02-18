/**
 * Credits management hook
 * Fetches and caches credit balance, handles purchases
 */

import { useState, useEffect, useCallback } from 'react';
import { getCredits, purchaseCredits } from '../api/credits';
import type { UserCredits } from '../types/credits';
import { useAuthStore } from '../stores/authStore';

interface UseCreditsReturn {
  credits: UserCredits | null;
  isLoading: boolean;
  error: string | null;
  /** Refresh credit balance from server */
  refresh: () => Promise<void>;
  /** Purchase credits via Square payment */
  purchase: (sourceId: string) => Promise<{ creditsAdded: number; creditsRemaining: number }>;
  /** Whether a purchase is in progress */
  isPurchasing: boolean;
}

export function useCredits(): UseCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore(state => !!state.sessionToken);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCredits(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getCredits();
      setCredits(response.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クレジット情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch credits on mount and when auth state changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchase = useCallback(async (sourceId: string) => {
    setIsPurchasing(true);
    setError(null);

    try {
      const response = await purchaseCredits(sourceId);

      // Refresh balance after purchase
      await refresh();

      return {
        creditsAdded: response.creditsAdded,
        creditsRemaining: response.creditsRemaining,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '決済処理に失敗しました';
      setError(message);
      throw new Error(message);
    } finally {
      setIsPurchasing(false);
    }
  }, [refresh]);

  return {
    credits,
    isLoading,
    error,
    refresh,
    purchase,
    isPurchasing,
  };
}
