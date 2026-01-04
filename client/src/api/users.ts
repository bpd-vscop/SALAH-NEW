import { http } from './http';
import type { ClientType, User, VerificationStatus } from '../types/api';

export interface ListUsersParams {
  role?: User['role'] | User['role'][];
  status?: User['status'] | User['status'][];
  search?: string;
  sort?: 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'updated';
  clientType?: ClientType | ClientType[];
  emailVerified?: boolean;
}

export type CreateUserPayload = {
  role: User['role'];
  status?: User['status'];
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  clientType?: ClientType;
  phoneCode?: string;
  phoneNumber?: string;
};

export type UpdateUserPayload = Partial<{
  name: string;
  fullName: string;
  username: string | null;
  email: string | null;
  role: User['role'];
  status: User['status'];
  statusChangeReason: string;
  password: string;
  profileImage: string | null;
  removeProfileImage: boolean;
  phoneCode: string | null;
  phoneNumber: string | null;
  clientType: ClientType;
  clientTypeChangeReason: string;
  companyName: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyBusinessType: string | null;
  companyTaxId: string | null;
  companyWebsite: string | null;
  verificationStatus: VerificationStatus;
  taxExempt: boolean;
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

const serializeParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const filtered = value.map(String).filter(Boolean);
    return filtered.length ? filtered.join(',') : undefined;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
};

const buildQueryString = (params?: ListUsersParams) => {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  const role = serializeParam(params.role);
  const status = serializeParam(params.status);
  const clientType = serializeParam(params.clientType);
  const sort = serializeParam(params.sort);
  const emailVerified = serializeParam(params.emailVerified);
  const searchTerm = serializeParam(params.search);

  if (role) search.set('role', role);
  if (status) search.set('status', status);
  if (clientType) search.set('clientType', clientType);
  if (sort) search.set('sort', sort);
  if (emailVerified) search.set('emailVerified', emailVerified);
  if (searchTerm) search.set('search', searchTerm);

  const query = search.toString();
  return query ? `?${query}` : '';
};

export const usersApi = {
  list: (params?: ListUsersParams) => http.get<{ users: User[] }>(`/users${buildQueryString(params)}`),
  create: (payload: CreateUserPayload) => http.post<{ user: User }>('/users', payload),
  update: (id: string, payload: UpdateUserPayload | FormData) =>
    http.put<{ user: User }>(`/users/${id}`, payload),
  delete: (id: string, payload?: { reason?: string }) => http.delete<void>(`/users/${id}`, payload),
  sendVerification: (id: string) => http.post<{ message: string; expiresAt?: string; previewCode?: string; alreadyVerified?: boolean }>(`/users/${id}/send-verification`, {}),

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
