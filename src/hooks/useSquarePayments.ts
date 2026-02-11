import { useState, useEffect, useRef, useCallback } from 'react';

const APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || '';
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || '';

export function useSquarePayments() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!window.Square) {
        setError('Square SDK が読み込まれていません');
        return;
      }

      try {
        const payments = await window.Square.payments(APP_ID, LOCATION_ID);
        if (cancelled) return;
        paymentsRef.current = payments;
        setIsReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Square の初期化に失敗しました');
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const attachCard = useCallback(async (selector: string) => {
    if (!paymentsRef.current) {
      throw new Error('Square Payments が初期化されていません');
    }

    // Destroy existing card if any
    if (cardRef.current) {
      await cardRef.current.destroy();
    }

    const card = await paymentsRef.current.card();
    await card.attach(selector);
    cardRef.current = card;
  }, []);

  const tokenize = useCallback(async (): Promise<string> => {
    if (!cardRef.current) {
      throw new Error('カードフォームが初期化されていません');
    }

    const result = await cardRef.current.tokenize();

    if (result.status !== 'OK' || !result.token) {
      const errorMessage = result.errors?.[0]?.message || 'カード情報の処理に失敗しました';
      throw new Error(errorMessage);
    }

    return result.token;
  }, []);

  const destroyCard = useCallback(async () => {
    if (cardRef.current) {
      await cardRef.current.destroy();
      cardRef.current = null;
    }
  }, []);

  return { isReady, error, attachCard, tokenize, destroyCard };
}
