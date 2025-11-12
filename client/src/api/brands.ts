import { http } from './http';

export interface BrandPayload {
  name: string;
  logoImage: string; // base64 data URL
  order?: number;
  isActive?: boolean;
}

export interface Brand extends Required<Pick<BrandPayload, 'name' | 'logoImage'>> {
  id: string;
  slug: string;
  order?: number;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const brandsApi = {
  list: () => http.get<{ brands: Brand[] }>('/brands'),
  create: (payload: BrandPayload) => http.post<{ brand: Brand }>('/brands', payload),
  update: (id: string, payload: Partial<BrandPayload>) =>
    http.put<{ brand: Brand }>(`/brands/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/brands/${id}`),
};
