import { beforeEach, describe, it, expect, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import type { AuthUser } from '../../types';

// Mock localStorage for sessionToken persistence tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const mockUser: AuthUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  authProvider: 'email',
  emailVerified: true,
};

const mockGoogleUser: AuthUser = {
  id: 'u2',
  name: 'Google User',
  email: 'google@example.com',
  authProvider: 'google',
  emailVerified: true,
};

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  useAuthStore.setState({
    authUser: null,
    authLoading: true,
    sessionToken: null,
  });
});

describe('authStore', () => {
  describe('initial state', () => {
    it('starts with authUser as null', () => {
      expect(useAuthStore.getState().authUser).toBeNull();
    });

    it('starts with authLoading as true', () => {
      expect(useAuthStore.getState().authLoading).toBe(true);
    });

    it('starts with sessionToken as null (when localStorage is empty)', () => {
      expect(useAuthStore.getState().sessionToken).toBeNull();
    });
  });

  describe('setAuthSession', () => {
    it('sets the authenticated user', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      expect(useAuthStore.getState().authUser).toEqual(mockUser);
    });

    it('sets authLoading to false', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      expect(useAuthStore.getState().authLoading).toBe(false);
    });

    it('stores session token in localStorage when provided', () => {
      useAuthStore.getState().setAuthSession(mockUser, 'token-abc-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('tsumugi_session_token', 'token-abc-123');
      expect(useAuthStore.getState().sessionToken).toBe('token-abc-123');
    });

    it('does not update sessionToken when token is not provided', () => {
      useAuthStore.setState({ sessionToken: 'existing-token' });
      useAuthStore.getState().setAuthSession(mockUser);
      // sessionToken should remain unchanged (not set to undefined)
      expect(useAuthStore.getState().authUser).toEqual(mockUser);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('handles different auth providers', () => {
      useAuthStore.getState().setAuthSession(mockGoogleUser, 'google-token');
      const state = useAuthStore.getState();
      expect(state.authUser?.authProvider).toBe('google');
      expect(state.sessionToken).toBe('google-token');
    });

    it('can overwrite an existing user', () => {
      useAuthStore.getState().setAuthSession(mockUser, 'token-1');
      useAuthStore.getState().setAuthSession(mockGoogleUser, 'token-2');
      expect(useAuthStore.getState().authUser).toEqual(mockGoogleUser);
      expect(useAuthStore.getState().sessionToken).toBe('token-2');
    });
  });

  describe('clearAuthSession', () => {
    it('clears the authenticated user', () => {
      useAuthStore.getState().setAuthSession(mockUser, 'token-abc');
      useAuthStore.getState().clearAuthSession();
      expect(useAuthStore.getState().authUser).toBeNull();
    });

    it('sets authLoading to false', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      useAuthStore.getState().clearAuthSession();
      expect(useAuthStore.getState().authLoading).toBe(false);
    });

    it('clears sessionToken from state', () => {
      useAuthStore.getState().setAuthSession(mockUser, 'token-abc');
      useAuthStore.getState().clearAuthSession();
      expect(useAuthStore.getState().sessionToken).toBeNull();
    });

    it('removes session token from localStorage', () => {
      useAuthStore.getState().setAuthSession(mockUser, 'token-abc');
      vi.clearAllMocks();
      useAuthStore.getState().clearAuthSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tsumugi_session_token');
    });

    it('is safe to call when already unauthenticated', () => {
      useAuthStore.getState().clearAuthSession();
      expect(useAuthStore.getState().authUser).toBeNull();
      expect(useAuthStore.getState().sessionToken).toBeNull();
    });
  });

  describe('setAuthLoading', () => {
    it('sets loading to true', () => {
      useAuthStore.getState().setAuthLoading(false);
      useAuthStore.getState().setAuthLoading(true);
      expect(useAuthStore.getState().authLoading).toBe(true);
    });

    it('sets loading to false', () => {
      useAuthStore.getState().setAuthLoading(false);
      expect(useAuthStore.getState().authLoading).toBe(false);
    });

    it('does not affect authUser when changing loading state', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      useAuthStore.getState().setAuthLoading(true);
      expect(useAuthStore.getState().authUser).toEqual(mockUser);
    });
  });

  describe('isAuthenticated (derived)', () => {
    it('is true when user exists', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      const { authUser } = useAuthStore.getState();
      expect(authUser !== null).toBe(true);
    });

    it('is false when user is null', () => {
      const { authUser } = useAuthStore.getState();
      expect(authUser !== null).toBe(false);
    });

    it('becomes false after clearAuthSession', () => {
      useAuthStore.getState().setAuthSession(mockUser);
      useAuthStore.getState().clearAuthSession();
      const { authUser } = useAuthStore.getState();
      expect(authUser !== null).toBe(false);
    });
  });
});
