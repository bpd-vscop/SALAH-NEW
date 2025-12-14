import { http } from './http';
import type { Category } from '../types/api';

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
  imageUrl?: string | null;
  heroImageUrl?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  parentId?: string | null;
  imageUrl?: string | null;
  heroImageUrl?: string | null;
}

export const categoriesApi = {
  list: () => http.get<{ categories: Category[] }>('/categories'),
  get: (id: string) => http.get<{ category: Category }>(`/categories/${id}`),
  create: (payload: CreateCategoryInput) => http.post<{ category: Category }>('/categories', payload),
  update: (id: string, payload: UpdateCategoryInput) =>
    http.put<{ category: Category }>(`/categories/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/categories/${id}`),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/categories/upload-image', formData);
    return response.data.path;
  },
  uploadHeroImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/categories/upload-hero-image', formData);
    return response.data.path;
  },
};
