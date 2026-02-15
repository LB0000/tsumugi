import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Image, Loader2, ArrowRight, Trash2, X, AlertCircle } from 'lucide-react';
import { formatDate } from '../../utils/format';
import { getGallery, getGalleryThumbnailUrl, getGalleryImageUrl, deleteGalleryItem } from '../../api';
import type { GalleryItemData } from '../../api';
import type { AuthUser } from '../../types';

interface Props {
  authUser: AuthUser;
}

export function AccountGallerySection({ authUser }: Props) {
  const [galleryItems, setGalleryItems] = useState<GalleryItemData[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const lightboxDialogRef = useRef<HTMLDivElement | null>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  const userId = authUser.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void getGallery()
      .then((data) => {
        if (!cancelled) setGalleryItems(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError('ギャラリーの読み込みに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setIsGalleryLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const handleDeleteGalleryItem = useCallback(async (itemId: string) => {
    setDeleteError(null);
    try {
      await deleteGalleryItem(itemId);
      setGalleryItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '削除に失敗しました');
    }
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  useEffect(() => {
    if (!lightboxImage) return;

    const previousOverflow = document.body.style.overflow;
    previousFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      lightboxCloseButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = lightboxDialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeInDialog = active ? dialog.contains(active) : false;

      if (event.shiftKey) {
        if (!activeInDialog || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!activeInDialog || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusedElementRef.current?.focus();
    };
  }, [lightboxImage, closeLightbox]);

  return (
    <>
      <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Image className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">生成作品ギャラリー</h2>
            <p className="text-xs text-muted">画像生成時に自動保存されます（最大20件）</p>
          </div>
        </div>

        {deleteError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-sale/10 border border-sale/20 rounded-lg text-sm text-sale">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {deleteError}
          </div>
        )}

        {isGalleryLoading ? (
          <div className="flex items-center justify-center py-8 text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />読み込み中...
          </div>
        ) : fetchError ? (
          <div className="text-center py-8">
            <p className="text-sale text-sm">{fetchError}</p>
          </div>
        ) : galleryItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted mb-4">まだ生成した作品がありません</p>
            <Link to="/" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
              作品を作成する <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {galleryItems.map((item) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border">
                <button
                  type="button"
                  onClick={() => setLightboxImage(getGalleryImageUrl(item.id))}
                  className="block w-full aspect-square"
                >
                  <img
                    src={getGalleryThumbnailUrl(item.id)}
                    alt={item.artStyleName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white font-medium truncate">{item.artStyleName}</p>
                  <p className="text-[10px] text-white/70">{formatDate(item.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteGalleryItem(item.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  title="削除"
                  aria-label="作品を削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            ref={lightboxDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="画像の拡大表示"
            className="relative max-w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={lightboxCloseButtonRef}
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="拡大表示を閉じる"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="拡大表示"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
