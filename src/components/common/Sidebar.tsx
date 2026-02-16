import { useEffect, useRef, useCallback } from 'react';
import { X, Home, LogIn, HelpCircle, FileText, User, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { navigation } from '../../data/navigation';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'home': Home,
  'sign-in': LogIn,
  'support': HelpCircle,
  'faq': HelpCircle,
};

export function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useAppStore();
  const { cartItems } = useCartStore();
  const { authUser } = useAuthStore();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const location = useLocation();

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSidebar();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    ).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [closeSidebar]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [isSidebarOpen, handleKeyDown]);

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={closeSidebar}
        role="presentation"
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーションメニュー"
        className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-background z-50 shadow-2xl transform transition-transform duration-300 animate-slideUp"
      >
        <div className="flex flex-col h-full">
          {/* Header - 和モダンスタイル */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex flex-col">
              <span className="font-serif text-lg font-semibold text-primary tracking-wider">メニュー</span>
              <span className="text-[10px] text-secondary tracking-[0.2em]">MENU</span>
            </div>
            <button
              ref={closeButtonRef}
              onClick={closeSidebar}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors group"
              aria-label="メニューを閉じる"
            >
              <X className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          {/* User Actions - Mobile */}
          <div className="p-4 border-b border-border bg-card/50 sm:hidden">
            <div className="flex items-center justify-around">
              <Link
                to={authUser ? '/account' : '/login'}
                className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors p-3"
                onClick={closeSidebar}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-xs">{authUser ? 'マイページ' : 'ログイン'}</span>
              </Link>
              <Link
                to="/cart"
                className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors p-3"
                onClick={closeSidebar}
              >
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-coral text-white text-[10px] rounded-full flex items-center justify-center">
                      {Math.min(cartCount, 99)}
                    </span>
                  )}
                </div>
                <span className="text-xs">カート</span>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="w-4 h-px bg-secondary" />
                <span className="tracking-wider">ナビゲーション</span>
              </div>
            </div>

            {navigation.map((item) => {
              const Icon = iconMap[item.id] || FileText;
              const isActive = location.pathname === item.path;
              const isExternal = item.path.startsWith('http');

              return (
                <div key={item.id}>
                  {isExternal ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-3.5 text-muted hover:bg-primary/5 hover:text-primary transition-all"
                      onClick={closeSidebar}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-all relative ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-primary/5 hover:text-primary'
                      }`}
                      onClick={closeSidebar}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                      )}
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-5 border-t border-border bg-gradient-to-t from-card/50 to-transparent">
            <div className="flex flex-col items-center gap-2">
              <div className="font-serif text-sm text-primary tracking-wider">TSUMUGI</div>
              <p className="text-[10px] text-muted">
                © {new Date().getFullYear()} TSUMUGI
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
