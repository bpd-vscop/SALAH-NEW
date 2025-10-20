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
};
