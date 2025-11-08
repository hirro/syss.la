import { useState, useEffect } from 'react';
import { getAuthState, setPersonalAccessToken, signOut } from '@/services/github/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthState = async () => {
      const state = await getAuthState();
      setIsAuthenticated(state.isAuthenticated);
      setLoading(false);
    };
    
    loadAuthState();
  }, []);

  const login = async (token: string) => {
    await setPersonalAccessToken(token);
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
