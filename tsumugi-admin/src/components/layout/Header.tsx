import { Menu } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';

export function Header({ title }: { title: string }) {
  const { toggleSidebar } = useAdminStore();

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-4">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
      >
        <Menu size={20} />
      </button>
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
