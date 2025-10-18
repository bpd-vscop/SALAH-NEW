import { http } from './http';

export interface ManufacturerPayload {
  name: string;
  logoImage: string; // base64 data URL
  heroImage?: string; // base64 data URL optional
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
};

