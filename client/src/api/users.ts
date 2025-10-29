import { http } from './http';
import type { User } from '../types/api';

export type UpdateUserPayload = Partial<{
  name: string;
  fullName: string;
  username: string;
  email: string;
  role: User['role'];
  status: User['status'];
  password: string;
  profileImage: string | null;
  removeProfileImage: boolean;
}>;

export type ShippingAddressPayload = {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

export const usersApi = {
  list: () => http.get<{ users: User[] }>('/users'),
  create: (payload: {
    name: string;
    username: string;
    role: User['role'];
    status: User['status'];
    password: string;
  }) => http.post<{ user: User }>('/users', payload),
  update: (id: string, payload: UpdateUserPayload | FormData) =>
    http.put<{ user: User }>(`/users/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/users/${id}`),

  // Shipping addresses
  addShippingAddress: (userId: string, payload: ShippingAddressPayload) =>
    http.post<{ user: User }>(`/users/${userId}/shipping-addresses`, payload),
  updateShippingAddress: (userId: string, addressId: string, payload: ShippingAddressPayload) =>
    http.put<{ user: User }>(`/users/${userId}/shipping-addresses/${addressId}`, payload),
  deleteShippingAddress: (userId: string, addressId: string) =>
    http.delete<{ user: User }>(`/users/${userId}/shipping-addresses/${addressId}`),

  // Password change
  requestPasswordChange: (userId: string) =>
    http.post<{ message: string; previewCode?: string }>(`/users/${userId}/request-password-change`, {}),
  changePassword: (userId: string, payload: { code: string; newPassword: string }) =>
    http.post<{ message: string; user: User }>(`/users/${userId}/change-password`, payload),

  // Phone update
  updatePhone: (userId: string, payload: { phoneCode: string; phoneNumber: string }) =>
    http.put<{ user: User }>(`/users/${userId}/phone`, payload),

  // B2B conversion
  convertToB2B: (userId: string, payload: FormData) =>
    http.post<{ user: User; message: string }>(`/users/${userId}/convert-to-b2b`, payload),
};
