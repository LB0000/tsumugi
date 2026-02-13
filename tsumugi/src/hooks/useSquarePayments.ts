import { useState, useEffect, useRef, useCallback } from 'react';

const APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || '';
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || '';
const SQUARE_ENVIRONMENT = import.meta.env.VITE_SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
const SQUARE_SDK_URL = SQUARE_ENVIRONMENT === 'production'
  ? 'https://web.squarecdn.com/v1/square.js'
  : 'https://sandbox.web.squarecdn.com/v1/square.js';

let squareSdkPromise: Promise<void> | null = null;

function loadSquareSdk(): Promise<void> {
  if (window.Square) return Promise.resolve();
  if (squareSdkPromise) return squareSdkPromise;

  squareSdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-square-sdk="${SQUARE_ENVIRONMENT}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Square SDK の読み込みに失敗しました')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SQUARE_SDK_URL;
    script.async = true;
    script.setAttribute('data-square-sdk', SQUARE_ENVIRONMENT);
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Square SDK の読み込みに失敗しました')), { once: true });
    document.body.appendChild(script);
  });

  return squareSdkPromise;
}

export function useSquarePayments() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!APP_ID || !LOCATION_ID) {
        setError('Square 決済設定が不足しています');
        return;
      }

      try {
        await loadSquareSdk();
        if (!window.Square) {
          throw new Error('Square SDK が利用できません');
        }

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
    return () => {
      cancelled = true;
      if (cardRef.current) {
        void cardRef.current.destroy();
        cardRef.current = null;
      }
    };
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
