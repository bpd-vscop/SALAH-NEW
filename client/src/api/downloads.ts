import { http } from './http';
import type { DownloadEntry, DownloadLink } from '../types/api';

export interface DownloadPayload {
  name: string;
  description?: string | null;
  image?: string | null;
  links: DownloadLink[];
}

export const downloadsApi = {
  list: () => http.get<{ downloads: DownloadEntry[] }>('/downloads'),
  getBySlug: (slug: string) =>
    http.get<{ download: DownloadEntry }>(`/downloads/slug/${encodeURIComponent(slug)}`),
  create: (payload: DownloadPayload) => http.post<{ download: DownloadEntry }>('/downloads', payload),
  update: (id: string, payload: Partial<DownloadPayload>) =>
    http.put<{ download: DownloadEntry }>(`/downloads/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/downloads/${id}`),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/downloads/upload-image', formData);
    return response.data.path;
  },
};
