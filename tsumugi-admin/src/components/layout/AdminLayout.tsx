import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
