import { http } from './http';
import type { Category } from '../types/api';

export const categoriesApi = {
  list: () => http.get<{ categories: Category[] }>('/categories'),
  create: (payload: { name: string; parentId?: string | null }) => http.post<{ category: Category }>('/categories', payload),
  update: (id: string, payload: { name?: string; parentId?: string | null }) =>
    http.put<{ category: Category }>(`/categories/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/categories/${id}`),
};
