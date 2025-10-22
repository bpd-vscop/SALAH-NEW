import { http } from './http';
import type { User } from '../types/api';

interface AuthResponse {
  user: User | null;
}

type GuestCartPayload = { guestCart?: Array<{ productId: string; quantity: number }> };

export const authApi = {
  me: () => http.get<AuthResponse>('/auth/me'),
  login: (payload: { username: string; password: string } & GuestCartPayload) =>
    http.post<AuthResponse>('/auth/login', payload),
  register: (
    payload: { name: string; email: string; password: string; username?: string } & GuestCartPayload
  ) =>
    http.post<AuthResponse>('/auth/register', payload),
  logout: () => http.post<void>('/auth/logout'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    http.post<{ message: string }>('/auth/change-password', payload),
  verifyEmail: (payload: { email: string; code: string }) => http.post<AuthResponse>('/auth/verify', payload),
  resendVerificationCode: (payload: { email: string }) =>
    http.post<{ email: string; expiresAt: string; requiresVerification: boolean; previewCode?: string }>(
      '/auth/resend-code',
      payload
    ),
  // Password Reset
  forgotPassword: (payload: { email: string }) =>
    http.post<{ message: string; email: string; expiresAt: string; previewCode?: string }>(
      '/auth/forgot-password',
      payload
    ),
  validateResetToken: (token: string) =>
    http.get<{ valid: boolean; token: string }>(`/auth/reset-password/${token}`),
  verifyResetCode: (payload: { email: string; code: string }) =>
    http.post<{ valid: boolean; token: string }>('/auth/verify-reset-code', payload),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    http.post<{ message: string }>('/auth/reset-password', payload),
};
