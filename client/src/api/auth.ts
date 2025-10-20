import { http } from './http';
import type { User } from '../types/api';

interface AuthResponse {
  user: User | null;
  requiresVerification?: boolean;
  verification?: {
    email: string;
    expiresAt: string;
  };
}

type GuestCartPayload = { guestCart?: Array<{ productId: string; quantity: number }> };

export type RegisterPayload =
  {
    clientType: 'B2B' | 'C2B';
    basicInfo: {
      fullName: string;
      email: string;
      password: string;
    };
    companyInfo?: {
      companyName?: string;
      companyAddress?: string;
      companyPhone?: string;
    };
  } & GuestCartPayload;

export const authApi = {
  me: () => http.get<AuthResponse>('/auth/me'),
  login: (payload: { email: string; password: string } & GuestCartPayload) =>
    http.post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => http.post<AuthResponse>('/auth/register', payload),
  logout: () => http.post<void>('/auth/logout'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    http.post<{ message: string }>('/auth/change-password', payload),
  verify: (payload: { email: string; code: string }) => http.post<{ message: string; user: User }>(
    '/auth/verify',
    payload
  ),
};
