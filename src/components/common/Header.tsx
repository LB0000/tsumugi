import { Menu, ShoppingCart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { categories } from '../../data/categories';

export function Header() {
  const { selectedCategory, setSelectedCategory, toggleSidebar } = useAppStore();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
      {/* Announcement Bar - 和モダン金色グラデーション */}
      <div className="bg-gradient-to-r from-primary via-secondary to-primary">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-6 text-sm">
          <span className="font-medium text-white tracking-wide">期間限定 送料無料キャンペーン</span>
          <span className="hidden sm:block w-px h-4 bg-white/30" />
          <span className="hidden sm:inline text-white/90 tracking-wide">初回ご注文 10%OFF</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
              <div className="flex flex-col">
                <span className="font-serif text-3xl font-bold text-primary tracking-widest transition-colors group-hover:text-primary-hover">
                  紡
                </span>
                <span className="text-[10px] text-secondary tracking-[0.4em] uppercase">
                  TSUMUGI
                </span>
              </div>
            </Link>

            {/* User Actions */}
            <div className="flex items-center gap-1">
              {/* User Icon */}
              <Link
                to="/login"
                className="hidden sm:flex p-3 hover:bg-card-hover transition-all duration-300 rounded-[var(--radius-button)]"
                aria-label="ログイン"
              >
                <User className="w-5 h-5 text-foreground" />
              </Link>

              {/* Cart Icon */}
              <Link
                to="/cart"
                className="p-3 hover:bg-card-hover transition-all duration-300 relative rounded-[var(--radius-button)]"
                aria-label="カート"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent-coral text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  0
                </span>
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

      {/* Category Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-3 scrollbar-thin">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 text-sm font-medium transition-all duration-300 whitespace-nowrap relative rounded-[var(--radius-button)] ${selectedCategory === category.id
                  ? 'text-white bg-primary shadow-sm'
                  : 'text-foreground hover:text-primary hover:bg-primary/5'
                  }`}
              >
                {category.name}
              </button>
            ))}

          </div>
        </div>
      </nav>
    </header>
  );
}
