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
    async ({ email, password, guestCart }) => {
      setLoading(true);
      try {
        const response = await authApi.login({ email, password, guestCart });
        const { user: loggedInUser } = response;
        if (!loggedInUser) {
          throw new Error('Login failed');
        }
        setUser(loggedInUser);
        return {
          user: loggedInUser,
          requiresVerification: Boolean(
            response.requiresVerification ??
              (loggedInUser.role === 'client' && loggedInUser.isEmailVerified === false)
          ),
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback<AuthContextValue['register']>(
    async ({ guestCart, ...payload }) => {
      setLoading(true);
      try {
        const response = await authApi.register({ guestCart, ...payload });
        const { user: registeredUser } = response;
        if (!registeredUser) {
          throw new Error('Registration failed');
        }
        setUser(registeredUser);
        return {
          user: registeredUser,
          requiresVerification: Boolean(
            response.requiresVerification ??
              (registeredUser.role === 'client' && registeredUser.isEmailVerified === false)
          ),
          verification: response.verification,
        };
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
