import { createContext } from 'react';
import type { User } from '../types/api';

export interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  loading: boolean;
  login: (input: { username: string; password: string; guestCart?: Array<{ productId: string; quantity: number }> }) => Promise<User>;
  register: (input: { name: string; email: string; password: string; username?: string; guestCart?: Array<{ productId: string; quantity: number }> }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
