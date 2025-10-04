// filepath: apps/admin/hooks/useAdminAuth.ts
"use client";

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, useApiUtils } from "../lib/api";

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
  const utils = useApiUtils();
  // Staff login mutation
  const staffLoginMutation = api.auth.staffLogin.useMutation({
    onSuccess: (data: any) => {
      if (data?.success && data?.user && data?.tokens) {
        store.login(
          {
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            role: data.user.role,
            hierarchyLevel: data.user.hierarchyLevel,
            permissions: data.user.permissions || {},
          },
          data.tokens
        );
      }
    },
  });

  return {
    ...store,
    isLoggedIn: store.isAuthenticated && !!store.user,
    userName: store.user ? `${store.user.firstName} ${store.user.lastName}` : '',
    login: async (email: string, password: string, rememberMe?: boolean) => {
      store.setLoading(true);
      try {
        const result = await staffLoginMutation.mutateAsync({ email, password, rememberMe });
        if (result?.success) {
          // Refetch queries that depend on auth, if any
          await utils.invalidateQueries();
          store.setLoading(false);
          return { success: true } as const;
        }
        store.setLoading(false);
        return { success: false, error: 'Invalid email or password' } as const;
      } catch (e: any) {
        store.setLoading(false);
        return { success: false, error: e?.message || 'Login failed' } as const;
      }
    },
    loginWithGoogle: async () => {
      // This would be implemented with Google OAuth
      console.log('Google login not implemented yet');
      return { success: false, error: 'Google login not implemented yet' };
    },
  };
}

// Simple provider for now - can be enhanced later
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}



