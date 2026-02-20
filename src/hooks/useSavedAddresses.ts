import { useState, useEffect, useRef } from 'react';
import { getAddresses, type SavedAddressItem } from '../api';

export interface UseSavedAddressesOptions {
  /** ログインユーザー（null の場合は保存済み住所を読み込まない） */
  authUser: { email: string } | null;
}

export interface UseSavedAddressesResult {
  /** 保存済み住所一覧 */
  savedAddresses: SavedAddressItem[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * 保存済み配送先住所の読み込みを提供するカスタムフック
 *
 * 機能:
 * - ログインユーザーの保存済み住所を読み込み
 * - エラーハンドリング
 *
 * Note: デフォルト住所の選択と適用判定は呼び出し側で実施してください
 */
export function useSavedAddresses(options: UseSavedAddressesOptions): UseSavedAddressesResult {
  const { authUser } = options;

  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!authUser || hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: loading state must be set synchronously before async call
    setIsLoading(true);
    setError(null);

    void getAddresses()
      .then((addresses) => {
        setSavedAddresses(addresses);
      })
      .catch((err: unknown) => {
        console.error('Failed to load saved addresses:', err);
        setError('保存済み配送先の読み込みに失敗しました');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authUser]);

  return {
    savedAddresses,
    isLoading,
    error,
  };
}
