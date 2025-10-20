import { createContext } from 'react';
import type { RegisterPayload } from '../api/auth';
import type { User } from '../types/api';

export interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  loading: boolean;
  login: (input: {
    email: string;
    password: string;
    guestCart?: Array<{ productId: string; quantity: number }>;
  }) => Promise<{ user: User; requiresVerification: boolean }>;
  register: (input: RegisterPayload) => Promise<{
    user: User;
    requiresVerification: boolean;
    verification?: { email: string; expiresAt: string };
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
