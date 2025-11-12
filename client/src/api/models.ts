import { http } from './http';

export interface ModelPayload {
  name: string;
  brandId?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface Model extends Required<Pick<ModelPayload, 'name'>> {
  id: string;
  slug: string;
  brandId?: string | null;
  order?: number;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const modelsApi = {
  list: () => http.get<{ models: Model[] }>('/models'),
  create: (payload: ModelPayload) => http.post<{ model: Model }>('/models', payload),
  update: (id: string, payload: Partial<ModelPayload>) =>
    http.put<{ model: Model }>(`/models/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/models/${id}`),
};
