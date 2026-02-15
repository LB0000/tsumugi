import { create } from 'zustand';
import type { AuthUser } from '../types';

interface AuthState {
  authUser: AuthUser | null;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  authLoading: true,
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setAuthSession: (user) => {
    set({ authUser: user, authLoading: false });
  },
  clearAuthSession: () => {
    set({ authUser: null, authLoading: false });
  },
}));
