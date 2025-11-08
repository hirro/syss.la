import { useState, useEffect } from 'react';
import { getAuthState, setPersonalAccessToken, signOut } from '@/services/github/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = getAuthState();
    setIsAuthenticated(state.isAuthenticated);
    setLoading(false);
  }, []);

  const login = async (token: string) => {
    setPersonalAccessToken(token);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    loading,
    login,
    logout,
  };
}
