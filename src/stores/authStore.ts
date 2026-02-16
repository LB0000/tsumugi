import { create } from 'zustand';
import type { AuthUser } from '../types';

const SESSION_TOKEN_KEY = 'tsumugi_session_token';

interface AuthState {
  authUser: AuthUser | null;
  authLoading: boolean;
  sessionToken: string | null;
  setAuthLoading: (loading: boolean) => void;
  setAuthSession: (user: AuthUser, sessionToken?: string) => void;
  clearAuthSession: () => void;
}

function loadSessionToken(): string | null {
  try { return localStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
}

export const useAuthStore = create<AuthState>((set) => ({
  authUser: null,
  authLoading: true,
  sessionToken: loadSessionToken(),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setAuthSession: (user, sessionToken) => {
    if (sessionToken) {
      try { localStorage.setItem(SESSION_TOKEN_KEY, sessionToken); } catch { /* ignore */ }
      set({ authUser: user, authLoading: false, sessionToken });
    } else {
      set({ authUser: user, authLoading: false });
    }
  },
  clearAuthSession: () => {
    try { localStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* ignore */ }
    set({ authUser: null, authLoading: false, sessionToken: null });
  },
}));
