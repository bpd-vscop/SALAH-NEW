import { http } from './http';

export interface BrandPayload {
  name: string;
  logoImage: string; // /uploads path
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
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/brands/upload-logo', formData);
    return response.data.path;
  },
};
