// filepath: apps/admin/hooks/useAdminAuth.ts
"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hierarchyLevel: number;
  permissions: Record<string, any>;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminAuthActions {
  login: (user: AdminUser, tokens: Tokens) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasMinimumHierarchy: (level: number) => boolean;
}

type AdminAuthStore = AdminAuthState & AdminAuthActions;

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      hasPermission: (resource: string, action: string) => {
        const { user } = get();
        if (!user || !user.permissions) return false;

        const resourcePermissions = user.permissions[resource];
        if (!resourcePermissions) return false;

        return resourcePermissions[action] === true;
      },

      hasMinimumHierarchy: (requiredLevel: number) => {
        const { user } = get();
        return user ? user.hierarchyLevel <= requiredLevel : false;
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function useAdminAuth() {
  const store = useAdminAuthStore();
  
  return {
    ...store,
    isLoggedIn: store.isAuthenticated && !!store.user,
    userName: store.user ? `${store.user.firstName} ${store.user.lastName}` : '',
  };
}
