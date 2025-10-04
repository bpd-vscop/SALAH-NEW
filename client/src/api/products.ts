import { http } from './http';
import type { Product, ProductTag } from '../types/api';

export interface ProductInput {
  name: string;
  categoryId: string;
  tags?: ProductTag[];
  description?: string;
  images?: string[];
  price?: number;
  attributes?: Record<string, string>;
}

export const productsApi = {
  list: (params?: { categoryId?: string; tags?: ProductTag[]; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) {
      query.append('categoryId', params.categoryId);
    }
    if (params?.tags?.length) {
      query.append('tags', params.tags.join(','));
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const search = query.toString();
    return http.get<{ products: Product[] }>(`/products${search ? `?${search}` : ''}`);
  },
  get: (id: string) => http.get<{ product: Product }>(`/products/${id}`),
  create: (payload: ProductInput) => http.post<{ product: Product }>('/products', payload),
  update: (id: string, payload: ProductInput) => http.put<{ product: Product }>(`/products/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/products/${id}`),
};
