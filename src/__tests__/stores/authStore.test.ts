import { useAuthStore } from '../../stores/authStore';
import type { AuthUser } from '../../types';

beforeEach(() => {
  useAuthStore.setState({
    authUser: null,
    authLoading: true,
  });
});

describe('setAuthSession / clearAuthSession', () => {
  const mockUser: AuthUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    authProvider: 'email',
    emailVerified: true,
  };

  it('sets the auth user', () => {
    useAuthStore.getState().setAuthSession(mockUser);
    expect(useAuthStore.getState().authUser).toEqual(mockUser);
  });

  it('clears the auth user', () => {
    useAuthStore.getState().setAuthSession(mockUser);
    useAuthStore.getState().clearAuthSession();
    expect(useAuthStore.getState().authUser).toBeNull();
  });
});
