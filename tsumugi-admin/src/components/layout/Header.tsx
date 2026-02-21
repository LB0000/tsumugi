import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { getUnreadAlertCount, getAlerts, markAlertRead, type AlertItem } from '../../api/settings';
import { useNavigate } from 'react-router-dom';

export function Header({ title }: { title: string }) {
  const { toggleSidebar } = useAdminStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadAlertCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    if (!showDropdown) {
      try {
        const alerts = await getAlerts(true);
        setRecentAlerts(alerts.slice(0, 5));
      } catch {
        // ignore
      }
    }
    setShowDropdown(!showDropdown);
  };

  const handleAlertClick = async (alert: AlertItem) => {
    if (!alert.isRead) {
      await markAlertRead(alert.id);
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setShowDropdown(false);
    navigate('/settings');
  };

  const severityColors: Record<string, string> = {
    info: 'text-blue-600',
    warning: 'text-warning',
    critical: 'text-danger',
  };

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
      >
        <Menu size={20} />
      </button>
      <h2 className="text-lg font-semibold flex-1">{title}</h2>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleBellClick}
          className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors relative"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-lg z-50">
            <div className="p-3 border-b border-border">
              <span className="font-medium text-sm">通知</span>
            </div>
            {recentAlerts.length === 0 ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                未読の通知はありません
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {recentAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${severityColors[alert.severity] ?? ''}`}>
                        {alert.severity === 'critical' ? '重大' : alert.severity === 'warning' ? '警告' : '情報'}
                      </span>
                      <span className="text-sm font-medium truncate">{alert.title}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{alert.message}</p>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setShowDropdown(false); navigate('/settings'); }}
              className="w-full p-2.5 text-center text-sm text-primary hover:bg-surface-secondary transition-colors border-t border-border rounded-b-xl"
            >
              全てのアラートを見る
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
