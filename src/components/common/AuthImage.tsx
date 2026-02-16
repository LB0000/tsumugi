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
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;

    fetchWithTimeout(src, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch image');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setLoaded({ src, blobUrl: url });
      })
      .catch(() => {
        // Fallback is shown since loaded remains null/stale
      });

    return () => { cancelled = true; };
  }, [src]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  if (!loaded || loaded.src !== src) {
    return fallback ?? null;
  }

  return <img {...imgProps} src={loaded.blobUrl} />;
}
