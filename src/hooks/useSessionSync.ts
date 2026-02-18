import { useEffect } from 'react';

export interface UseSessionSyncOptions {
  /** SessionStorage のキー */
  key: string;
  /** 保存するデータ（null の場合は保存しない） */
  data: unknown | null;
  /** データが存在するかどうかの条件 */
  enabled?: boolean;
}

/**
 * SessionStorage への自動同期フック
 *
 * 機能:
 * - データが変更されるたびに sessionStorage に保存
 * - ストレージエラーを自動的に無視（プライベートブラウジング対応）
 * - enabled フラグで同期の有効/無効を制御可能
 *
 * 使用例:
 * ```tsx
 * function MyPage() {
 *   const [userId, setUserId] = useState<string | null>(null);
 *   useSessionSync({
 *     key: 'my-user-id',
 *     data: userId ? { userId } : null,
 *     enabled: !!userId,
 *   });
 * }
 * ```
 */
export function useSessionSync(options: UseSessionSyncOptions): void {
  const { key, data, enabled = true } = options;

  useEffect(() => {
    if (!enabled || data === null) return;

    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage errors (e.g., private browsing mode, quota exceeded)
    }
  }, [key, data, enabled]);
}
