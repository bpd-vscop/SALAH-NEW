import { http } from './http';
import type { User } from '../types/api';

export const usersApi = {
  list: () => http.get<{ users: User[] }>('/users'),
  create: (payload: {
    name: string;
    email: string;
    username: string;
    role: User['role'];
    status: User['status'];
    password: string;
  }) => http.post<{ user: User }>('/users', payload),
  update: (
    id: string,
    payload: Partial<{
      name: string;
      email: string;
      username: string;
      role: User['role'];
      status: User['status'];
      password: string;
      profileImageUrl: string | null;
    }>
  ) => http.put<{ user: User }>(`/users/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/users/${id}`),
};
