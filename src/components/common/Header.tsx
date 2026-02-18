import { LogOut, Menu, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { categories } from '../../data/categories';
import { logoutAuth } from '../../api';

export function Header() {
  const { toggleSidebar, resetUpload } = useAppStore();
  const { cartItems, clearCart } = useCartStore();
  const { authUser, clearAuthSession } = useAuthStore();
  const { pathname } = useLocation();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    try {
      await logoutAuth();
    } catch {
      // Logout should still clear client session if API call fails
    } finally {
      sessionStorage.removeItem('tsumugi-result');
      resetUpload();
      clearCart();
      clearAuthSession();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
      {/* Announcement Bar - 和モダン金色グラデーション */}
      <div className="bg-gradient-to-r from-primary via-secondary to-primary">
        <div className="max-w-7xl mx-auto px-4 py-1.5 sm:py-2.5 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
          <span className="font-medium text-white tracking-wide">期間限定 初回ご注文 10%OFF</span>
          <span className="hidden sm:block w-px h-4 bg-white/30" />
          <span className="hidden sm:inline text-white/90 tracking-wide">プレビュー無料・登録不要</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-20 gap-4 sm:gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <img
                src="/logo.png"
                alt="TSUMUGI"
                className="h-10 sm:h-14 w-auto transition-opacity group-hover:opacity-80"
              />
            </Link>

            {/* User Actions */}
            <div className="flex items-center gap-1">
              {/* User Icon / Session */}
              {authUser ? (
                <div className="hidden sm:flex items-center gap-1">
                  <Link
                    to="/account"
                    className="px-3 py-2 rounded-[var(--radius-button)] bg-card border border-border text-sm text-foreground hover:bg-card-hover hover:border-primary/30 transition-all"
                    title={`${authUser.name} としてログイン中`}
                  >
                    {authUser.name}
                  </Link>
                  <button
                    onClick={() => void handleLogout()}
                    className="p-3 hover:bg-card-hover transition-all duration-300 rounded-[var(--radius-button)]"
                    aria-label="ログアウト"
                  >
                    <LogOut className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex p-3 hover:bg-card-hover transition-all duration-300 rounded-[var(--radius-button)]"
                  aria-label="ログイン"
                >
                  <User className="w-5 h-5 text-foreground" />
                </Link>
              )}

              {/* Cart Icon */}
              <Link
                to="/cart"
                className="p-3 hover:bg-card-hover transition-all duration-300 relative rounded-[var(--radius-button)]"
                aria-label={cartCount > 0 ? `カート（${Math.min(cartCount, 99)}${cartCount > 99 ? '+' : ''}点）` : 'カート'}
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-accent-coral text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                    {Math.min(cartCount, 99)}
                  </span>
                )}
              </Link>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-border mx-2" />

              {/* Menu Button */}
              <button
                onClick={toggleSidebar}
                className="p-3 hover:bg-card-hover transition-all duration-300 rounded-[var(--radius-button)]"
                aria-label="メニューを開く"
              >
                <Menu className="w-6 h-6 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation — 全ページ表示 */}
      <nav className="bg-card border-b border-border" aria-label="カテゴリナビゲーション">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 sm:py-3 scrollbar-thin">
            {categories.map((category) => {
              const isActive = pathname === `/${category.id}`;
              return (
                <Link
                  key={category.id}
                  to={`/${category.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap relative rounded-[var(--radius-button)] ${isActive
                    ? 'text-white bg-primary shadow-sm'
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
