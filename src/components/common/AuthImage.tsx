import { useState, useEffect, useRef } from 'react';
import { fetchWithTimeout } from '../../api/common';

interface AuthImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null;
  fallback?: React.ReactNode;
}

/**
 * Image component that fetches images via authenticated requests (Bearer token).
 * Converts the response to a blob URL for use in <img src>.
 * Required for cross-origin setups where cookies are blocked (Vercel → Railway).
 */
export function AuthImage({ src, fallback, ...imgProps }: AuthImageProps) {
  const [loaded, setLoaded] = useState<{ src: string; blobUrl: string } | null>(null);
  const [error, setError] = useState<{ src: string } | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) return;

    const controller = new AbortController();

    fetchWithTimeout(src, { credentials: 'include', signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch image');
        return res.blob();
      })
      .then((blob) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setLoaded({ src, blobUrl: url });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError({ src });
      });

    return () => {
      controller.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  // Error for current src, or not yet loaded
  if (error?.src === src || !loaded || loaded.src !== src) {
    return fallback ?? null;
  }

  return <img {...imgProps} src={loaded.blobUrl} />;
}
