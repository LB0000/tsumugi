import { useState, useEffect } from 'react';

const DISCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24時間

export interface UseDiscountTimerResult {
  /** 24時間以内かどうか */
  isWithin24Hours: boolean;
  /** 残り時間（HH:MM:SS） */
  timeRemaining: string;
}

/**
 * 24時間限定割引タイマーのカスタムフック
 *
 * 機能:
 * - localStorage から生成時刻を取得
 * - 24時間以内かどうかを判定
 * - 残り時間を HH:MM:SS 形式で提供
 * - タブが非表示の時はタイマーを停止（バッテリー節約）
 * - 割引期限切れ後はタイマーを自動停止
 *
 * @param storageKey - localStorage のキー
 */
export function useDiscountTimer(storageKey: string): UseDiscountTimerResult {
  const [isWithin24Hours, setIsWithin24Hours] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const generated = parseInt(raw, 10);
      if (Number.isNaN(generated) || generated <= 0) return false;
      const elapsed = Date.now() - generated;
      return elapsed >= 0 && elapsed <= DISCOUNT_WINDOW_MS;
    } catch {
      return false;
    }
  });
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');

  useEffect(() => {
    let raw: string | null = null;

    // localStorage はプライベートブラウジングモードで例外を投げる可能性がある
    try {
      raw = localStorage.getItem(storageKey);
      if (!raw) {
        raw = Date.now().toString();
        localStorage.setItem(storageKey, raw);
      }
    } catch {
      // localStorage が使えない場合は現在時刻から開始
      raw = Date.now().toString();
    }

    const generated = parseInt(raw, 10);

    if (Number.isNaN(generated) || generated <= 0) {
      // useState initializer already handles this case — no setState needed
      return;
    }

    let intervalId: number;

    const tick = () => {
      const remaining = DISCOUNT_WINDOW_MS - (Date.now() - generated);

      if (remaining <= 0) {
        setIsWithin24Hours(false);
        setTimeRemaining('00:00:00');
        clearInterval(intervalId);
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    tick(); // 初回実行
    intervalId = setInterval(tick, 1000); // 1秒ごとに更新（visibility対応でバッテリー節約済み）

    // タブが非表示の時はタイマーを停止
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        // まだ割引期間内かチェック
        const remaining = DISCOUNT_WINDOW_MS - (Date.now() - generated);
        if (remaining > 0) {
          tick(); // タブが再表示されたら即座に更新
          intervalId = setInterval(tick, 1000);
        } else {
          // 既に期限切れの場合は新しいタイマーを作らない
          setIsWithin24Hours(false);
          setTimeRemaining('00:00:00');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storageKey]);

  return {
    isWithin24Hours,
    timeRemaining,
  };
}
