import { create } from 'zustand';

interface AdminStore {
  isAuthenticated: boolean;
  sidebarOpen: boolean;
  setAuthenticated: (value: boolean) => void;
  toggleSidebar: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isAuthenticated: !!localStorage.getItem('admin_token'),
  sidebarOpen: true,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
