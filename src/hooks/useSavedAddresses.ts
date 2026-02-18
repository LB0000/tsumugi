import { useState, useEffect, useRef } from 'react';
import { getAddresses, type SavedAddressItem } from '../api';
import type { ShippingAddress } from '../types';

export interface UseSavedAddressesOptions {
  /** ログインユーザー（null の場合は保存済み住所を読み込まない） */
  authUser: { email: string } | null;
  /** フォームがタッチされたかどうか */
  formTouched: boolean;
}

export interface UseSavedAddressesResult {
  /** 保存済み住所一覧 */
  savedAddresses: SavedAddressItem[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** デフォルト住所（またはログインユーザーの場合の初期住所） */
  defaultAddress: ShippingAddress | null;
}

/**
 * 保存済み配送先住所の読み込みを提供するカスタムフック
 *
 * 機能:
 * - ログインユーザーの保存済み住所を読み込み
 * - デフォルト住所の自動選択
 * - エラーハンドリング
 */
export function useSavedAddresses(options: UseSavedAddressesOptions): UseSavedAddressesResult {
  const { authUser, formTouched } = options;

  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<ShippingAddress | null>(null);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!authUser || hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    setIsLoading(true);
    setError(null);

    void getAddresses()
      .then((addresses) => {
        setSavedAddresses(addresses);

        // デフォルト住所を選択（formTouched が false の場合のみ）
        if (!formTouched) {
          const defaultAddr = addresses.find((address) => address.isDefault) ?? (addresses.length === 1 ? addresses[0] : null);
          if (defaultAddr) {
            setDefaultAddress({
              lastName: defaultAddr.lastName,
              firstName: defaultAddr.firstName,
              email: defaultAddr.email,
              phone: defaultAddr.phone,
              postalCode: defaultAddr.postalCode,
              prefecture: defaultAddr.prefecture,
              city: defaultAddr.city,
              addressLine: defaultAddr.addressLine,
            });
          }
        }
      })
      .catch(() => {
        setError('保存済み配送先の読み込みに失敗しました');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authUser, formTouched]);

  return {
    savedAddresses,
    isLoading,
    error,
    defaultAddress,
  };
}
