import { X, ChevronRight, Home, Palette, DollarSign, LogIn, Info, HelpCircle, FileText, User, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { navigation } from '../../data/navigation';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'home': Home,
  'create': Palette,
  'pricing': DollarSign,
  'sign-in': LogIn,
  'about': Info,
  'support': HelpCircle,
  'faq': HelpCircle,
};

export function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useAppStore();
  const location = useLocation();

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={closeSidebar}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-background z-50 shadow-2xl transform transition-transform duration-300 animate-slideUp">
        <div className="flex flex-col h-full">
          {/* Header - 和モダンスタイル */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex flex-col">
              <span className="font-serif text-lg font-semibold text-primary tracking-wider">メニュー</span>
              <span className="text-[10px] text-secondary tracking-[0.2em]">MENU</span>
            </div>
            <button
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
                to="/login"
                className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors p-3"
                onClick={closeSidebar}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-xs">ログイン</span>
              </Link>
              <Link
                to="/cart"
                className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors p-3"
                onClick={closeSidebar}
              >
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-coral text-white text-[10px] rounded-full flex items-center justify-center">0</span>
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
                      {item.children && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  )}

                  {/* Sub-navigation */}
                  {item.children && (
                    <div className="ml-10 border-l-2 border-secondary/30">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.path}
                          className="block px-4 py-2.5 text-sm text-muted hover:text-primary hover:bg-primary/5 transition-all"
                          onClick={closeSidebar}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-5 border-t border-border bg-gradient-to-t from-card/50 to-transparent">
            <div className="flex flex-col items-center gap-2">
              <div className="font-serif text-sm text-primary tracking-wider">藝術贈物</div>
              <p className="text-[10px] text-muted">
                © 2024 Art Gift Japan
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
