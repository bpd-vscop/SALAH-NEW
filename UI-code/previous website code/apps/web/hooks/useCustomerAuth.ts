// filepath: apps/web/hooks/useCustomerAuth.ts
// Customer authentication hook for web application

"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, useApiUtils } from '../lib/api';
import { CustomerJWTPayload } from '@automotive/auth';

interface CustomerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified: boolean;
  userType: 'client';
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface CustomerAuthState {
  user: CustomerUser | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  vtaVerifications: any[];
}

interface CustomerAuthActions {
  login: (user: CustomerUser, tokens: Tokens) => void;
  logout: () => void;
  updateUser: (user: Partial<CustomerUser>) => void;
  setLoading: (loading: boolean) => void;
  refreshTokens: () => Promise<void>;
  setVtaVerifications: (verifications: any[]) => void;
}

type CustomerAuthStore = CustomerAuthState & CustomerAuthActions;

export const useCustomerAuthStore = create<CustomerAuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      vtaVerifications: [],

      // Actions
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
          vtaVerifications: [],
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

      refreshTokens: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          get().logout();
          return;
        }

        try {
          // Note: This would need to be implemented with actual api call
          // const result = await api.auth.refreshToken.mutate({
          //   refreshToken: tokens.refreshToken
          // });
          // 
          // if (result.success) {
          //   set({
          //     tokens: {
          //       accessToken: result.accessToken,
          //       refreshToken: tokens.refreshToken
          //     }
          //   });
          // }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
        }
      },

      setVtaVerifications: (verifications) => {
        set({ vtaVerifications: verifications });
      },
    }),
    {
      name: 'customer-auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Custom hook for customer authentication
export function useCustomerAuth() {
  const store = useCustomerAuthStore();
  const utils = useApiUtils();

  // Login mutation
  const loginMutation = api.auth.clientLogin.useMutation({
    onSuccess: (data) => {
      if (data.success && data.user && data.tokens) {
        store.login(data.user as CustomerUser, data.tokens);
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      store.setLoading(false);
    },
  });

  // Registration mutation
  const registerMutation = api.auth.clientRegister.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Registration successful, but user needs to verify email
        store.setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Registration failed:', error);
      store.setLoading(false);
    },
  });

  // Google OAuth mutation
  const googleAuthMutation = api.auth.clientGoogleAuth.useMutation({
    onSuccess: (data) => {
      if (data.success && data.user && data.tokens) {
        store.login(data.user as CustomerUser, data.tokens);
      }
    },
    onError: (error) => {
      console.error('Google auth failed:', error);
      store.setLoading(false);
    },
  });

  // Get current user query
  const { data: currentUser, isLoading: isLoadingUser } = api.auth.me.useQuery(
    undefined,
    {
      enabled: store.isAuthenticated && !!store.tokens?.accessToken,
      retry: false,
      onError: () => {
        // If getting current user fails, logout
        store.logout();
      },
    }
  );

  // VTA verification queries
  const { data: vtaVerifications, refetch: refetchVtaVerifications } = 
    api.auth.getVtaVerificationStatus.useQuery(
      undefined,
      {
        enabled: store.isAuthenticated,
        onSuccess: (data) => {
          store.setVtaVerifications(data || []);
        },
      }
    );

  // VTA submission mutation
  const submitVtaMutation = api.auth.submitVtaVerification.useMutation({
    onSuccess: () => {
      refetchVtaVerifications();
    },
  });

  // VTA document upload mutation
  const uploadVtaDocumentMutation = api.auth.uploadVtaDocument.useMutation({
    onSuccess: () => {
      refetchVtaVerifications();
    },
  });

  // Login function
  const login = async (email: string, password: string, rememberMe?: boolean) => {
    store.setLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password, rememberMe });
    } catch (error) {
      store.setLoading(false);
      throw error;
    }
  };

  // Register function
  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    store.setLoading(true);
    try {
      return await registerMutation.mutateAsync(data);
    } catch (error) {
      store.setLoading(false);
      throw error;
    }
  };

  // Google OAuth function
  const loginWithGoogle = async (token: string) => {
    store.setLoading(true);
    try {
      await googleAuthMutation.mutateAsync({ token });
    } catch (error) {
      store.setLoading(false);
      throw error;
    }
  };

  // Submit VTA verification
  const submitVtaVerification = async (data: {
    businessName: string;
    businessType: string;
    licenseNumber?: string;
    taxId?: string;
    stateOfOperation: string;
    customerNotes?: string;
    orderId?: string;
  }) => {
    return await submitVtaMutation.mutateAsync(data);
  };

  // Upload VTA document
  const uploadVtaDocument = async (data: {
    vtaVerificationId: string;
    documentType: 'BUSINESS_LICENSE' | 'LOCKSMITH_LICENSE' | 'TAX_CERTIFICATE' | 'INSURANCE_PROOF' | 'STATE_REGISTRATION' | 'OTHER';
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }) => {
    return await uploadVtaDocumentMutation.mutateAsync(data);
  };

  // Logout function
  const logout = () => {
    store.logout();
    utils.invalidateQueries();
  };

  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading || isLoadingUser,
    vtaVerifications: store.vtaVerifications,

    // Actions
    login,
    register,
    loginWithGoogle,
    logout,
    submitVtaVerification,
    uploadVtaDocument,
    updateUser: store.updateUser,
    refreshTokens: store.refreshTokens,

    // Mutation states
    isLoggingIn: loginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    isSubmittingVta: submitVtaMutation.isLoading,
    isUploadingDocument: uploadVtaDocumentMutation.isLoading,

    // Refetch functions
    refetchVtaVerifications,
  };
}

// VTA verification status helper
export function useVtaVerificationStatus() {
  const { vtaVerifications } = useCustomerAuth();
  
  const latestVerification = vtaVerifications?.[0];
  const hasActiveVerification = latestVerification && 
    ['PENDING', 'APPROVED'].includes(latestVerification.status);
  const needsVerification = !hasActiveVerification;
  const isVerified = latestVerification?.status === 'APPROVED';
  const isRejected = latestVerification?.status === 'REJECTED';
  const isPending = latestVerification?.status === 'PENDING';

  return {
    latestVerification,
    hasActiveVerification,
    needsVerification,
    isVerified,
    isRejected,
    isPending,
    verificationCount: vtaVerifications?.length || 0,
  };
}




