import { NavLink } from 'react-router-dom';
import { BarChart3, FileText, Megaphone, Settings, LogOut, Users, Target, Star, Zap } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { logout } from '../../api';

const navItems = [
  { to: '/', icon: BarChart3, label: 'ダッシュボード' },
  { to: '/customers', icon: Users, label: '顧客管理' },
  { to: '/content', icon: FileText, label: 'コンテンツ' },
  { to: '/campaigns', icon: Megaphone, label: 'キャンペーン' },
  { to: '/automations', icon: Zap, label: '自動配信' },
  { to: '/strategy', icon: Target, label: '戦略' },
  { to: '/reviews', icon: Star, label: 'レビュー' },
  { to: '/settings', icon: Settings, label: '設定' },
];

export function Sidebar() {
  const { sidebarOpen, setAuthenticated } = useAdminStore();

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="w-60 bg-white border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-bold text-primary">TSUMUGI Admin</h1>
        <p className="text-xs text-text-secondary mt-0.5">マーケティング管理</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-red-50 hover:text-danger w-full transition-colors"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
