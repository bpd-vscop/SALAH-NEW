import { http } from './http';

export interface ManufacturerPayload {
  name: string;
  logoImage: string; // /uploads path
  heroImage?: string; // /uploads path or empty string
  order?: number;
  isActive?: boolean;
}

export interface Manufacturer extends Required<Pick<ManufacturerPayload, 'name' | 'logoImage'>> {
  id: string;
  slug: string;
  heroImage?: string;
  order?: number;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const manufacturersApi = {
  list: () => http.get<{ manufacturers: Manufacturer[] }>('/manufacturers'),
  create: (payload: ManufacturerPayload) => http.post<{ manufacturer: Manufacturer }>('/manufacturers', payload),
  update: (id: string, payload: Partial<ManufacturerPayload>) =>
    http.put<{ manufacturer: Manufacturer }>(`/manufacturers/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/manufacturers/${id}`),
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/manufacturers/upload-logo', formData);
    return response.data.path;
  },
  uploadHero: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/manufacturers/upload-hero', formData);
    return response.data.path;
  },
};
