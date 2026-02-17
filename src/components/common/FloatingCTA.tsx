import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

// ヒーローCTAが見えなくなるまでのスクロール量（フォールバック用）
const FALLBACK_SCROLL_THRESHOLD = 600;

export function FloatingCTA() {
  const [visibilityByPath, setVisibilityByPath] = useState<Record<string, boolean>>({});
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const { pathname } = useLocation();
  const isHomePage = pathname === '/' || pathname === '/pets' || pathname === '/family' || pathname === '/kids';
  const isStyleModalOpen = useAppStore((s) => s.isStyleModalOpen);
  const isDismissed = dismissedPath === pathname;
  const isVisible = visibilityByPath[pathname] ?? false;

  useEffect(() => {
    if (!isHomePage || isDismissed) {
      // パスが変わったら可視性をリセット
      setVisibilityByPath((prev) => ({ ...prev, [pathname]: false }));
      return;
    }

    // ヒーローCTAボタンの可視性を監視
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = !entry.isIntersecting;
        setVisibilityByPath((prev) => (
          prev[pathname] === nextVisible
            ? prev
            : { ...prev, [pathname]: nextVisible }
        ));
      },
      { threshold: 0 }
    );

    const heroCTA = document.getElementById('hero-cta');
    if (heroCTA) {
      observer.observe(heroCTA);
      return () => observer.disconnect();
    } else {
      // フォールバック: スクロール量で判定
      const handleScroll = () => {
        const nextVisible = window.scrollY > FALLBACK_SCROLL_THRESHOLD;
        setVisibilityByPath((prev) => (
          prev[pathname] === nextVisible
            ? prev
            : { ...prev, [pathname]: nextVisible }
        ));
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isDismissed, isHomePage, pathname]);

  const handleClick = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedPath(pathname);
  };

  if (!isHomePage || isStyleModalOpen || isDismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="プレビューへのショートカット"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
      }`}
    >
      {/* モバイル: 画面下部バー */}
      <div className="md:hidden pointer-events-auto">
        <div className="bg-background/95 backdrop-blur-md border-t border-border px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClick}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
            >
              <Sparkles className="w-4 h-4" />
              無料でプレビューを見る
            </button>
            <button
              onClick={handleDismiss}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-foreground transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* デスクトップ: 右下フローティング */}
      <div className="hidden md:block pointer-events-auto">
        <div className="fixed bottom-6 right-6">
          <div className="relative flex items-center gap-2 p-1.5 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl">
            <button
              onClick={handleClick}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              無料でプレビューを見る
            </button>
            <button
              onClick={handleDismiss}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-foreground transition-colors"
              aria-label="閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
