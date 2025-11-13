import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../use-auth';
import * as authService from '@/services/github/auth';

// Mock the auth service
jest.mock('@/services/github/auth');

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    (authService.getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: false,
      token: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should load authenticated state', async () => {
    (authService.getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      token: 'test-token',
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login', async () => {
    (authService.getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: false,
      token: null,
    });
    (authService.setPersonalAccessToken as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.login('new-token');
    });

    expect(authService.setPersonalAccessToken).toHaveBeenCalledWith('new-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle logout', async () => {
    (authService.getAuthState as jest.Mock).mockResolvedValue({
      isAuthenticated: true,
      token: 'test-token',
    });
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
