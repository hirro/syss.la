import { useState, useEffect } from 'react';
import { getAuthState, setPersonalAccessToken, signOut } from '@/services/github/auth';

// Simple event emitter for React Native
class SimpleEventEmitter {
  private listeners: Set<(authenticated: boolean) => void> = new Set();

  on(callback: (authenticated: boolean) => void) {
    this.listeners.add(callback);
  }

  off(callback: (authenticated: boolean) => void) {
    this.listeners.delete(callback);
  }

  emit(authenticated: boolean) {
    this.listeners.forEach(callback => callback(authenticated));
  }
}

// Create a global event emitter for auth state changes
const authEmitter = new SimpleEventEmitter();

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

    // Listen for auth state changes
    const handleAuthChange = (authenticated: boolean) => {
      setIsAuthenticated(authenticated);
    };

    authEmitter.on(handleAuthChange);

    return () => {
      authEmitter.off(handleAuthChange);
    };
  }, []);

  const login = async (token: string) => {
    await setPersonalAccessToken(token);
    setIsAuthenticated(true);
    authEmitter.emit(true);
  };

  const logout = async () => {
    await signOut();
    setIsAuthenticated(false);
    authEmitter.emit(false);
  };

  return {
    isAuthenticated,
    loading,
    login,
    logout,
  };
}
