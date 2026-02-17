import { useEffect, useRef, useState } from 'react';

interface PostalCodeResult {
  prefecture: string;
  city: string;
  town: string;
  isLoading: boolean;
  error: string | null;
}

interface ZipcloudResponse {
  status: number;
  results: { address1: string; address2: string; address3: string }[] | null;
}

export function usePostalCodeLookup(postalCode: string): PostalCodeResult {
  const [result, setResult] = useState<Omit<PostalCodeResult, 'isLoading' | 'error'>>({
    prefecture: '',
    city: '',
    town: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Normalize: remove hyphens
    const digits = postalCode.replace(/-/g, '');

    // Only fire when exactly 7 digits
    if (!/^\d{7}$/.test(digits)) {
      return;
    }

    // Cancel any pending request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    // 300ms debounce
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`, {
        signal: controller.signal,
      })
        .then((res) => res.json() as Promise<ZipcloudResponse>)
        .then((data) => {
          if (controller.signal.aborted) return;
          if (data.status !== 200 || !data.results?.length) {
            setError('該当する住所が見つかりませんでした');
            return;
          }
          const { address1, address2, address3 } = data.results[0];
          setResult({ prefecture: address1, city: address2, town: address3 });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setError('住所の検索に失敗しました');
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [postalCode]);

  return { ...result, isLoading, error };
}
