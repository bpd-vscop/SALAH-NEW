import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.warn('Auth check failed', error);
      setUser(null);
      return null;
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback<AuthContextValue['login']>(
    async ({ username, password, guestCart }) => {
      setLoading(true);
      try {
        const { user: loggedInUser } = await authApi.login({ username, password, guestCart });
        if (!loggedInUser) {
          throw new Error('Login failed');
        }
        setUser(loggedInUser);
        return loggedInUser;
      } catch (error: any) {
        // If login fails due to unverified email, the error will contain verification data
        // Re-throw the error so LoginPage can handle the redirect to /verify-email
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback<AuthContextValue['register']>(
    async ({ name, email, password, username, guestCart }) => {
      setLoading(true);
      try {
        const { user: registeredUser } = await authApi.register({ name, email, password, username, guestCart });
        if (!registeredUser) {
          throw new Error('Registration failed');
        }
        setUser(registeredUser);
        return registeredUser;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      const currentPath = window.location.pathname;
      const protectedRoots = ['/account', '/checkout', '/admin'];
      if (protectedRoots.some((root) => currentPath.startsWith(root))) {
        window.location.assign('/');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { user: refreshedUser } = await authApi.me();
      setUser(refreshedUser);
      return refreshedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, loading, login, register, logout, refresh, setUser }),
    [user, initializing, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
