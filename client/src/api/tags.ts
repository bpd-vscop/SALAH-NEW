import { http } from './http';

export interface TagPayload {
  name: string;
  order?: number;
  isActive?: boolean;
}

export interface Tag extends Required<Pick<TagPayload, 'name'>> {
  id: string;
  slug: string;
  order?: number;
  isActive?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const tagsApi = {
  list: () => http.get<{ tags: Tag[] }>('/tags'),
  create: (payload: TagPayload) => http.post<{ tag: Tag }>('/tags', payload),
  update: (id: string, payload: Partial<TagPayload>) =>
    http.put<{ tag: Tag }>(`/tags/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/tags/${id}`),
};
