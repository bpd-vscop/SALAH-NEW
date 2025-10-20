import { http } from './http';
import type { User } from '../types/api';

interface AuthResponse {
  user: User | null;
}

type GuestCartPayload = { guestCart?: Array<{ productId: string; quantity: number }> };

export interface ClientRegistrationPayload extends GuestCartPayload {
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
}

export const authApi = {
  me: () => http.get<AuthResponse>('/auth/me'),
  login: (payload: { identifier: string; password: string } & GuestCartPayload) =>
    http.post<AuthResponse>('/auth/login', payload),
  register: (payload: ClientRegistrationPayload) => http.post<AuthResponse>('/auth/register', payload),
  logout: () => http.post<void>('/auth/logout'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    http.post<{ message: string }>('/auth/change-password', payload),
  verifyEmail: (payload: { email: string; code: string }) =>
    http.post<{ message: string }>('/auth/verify', payload),
  resendVerification: (payload: { email: string }) =>
    http.post<{ message: string }>('/auth/verify/resend', payload),
};
