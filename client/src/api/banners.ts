import { http } from './http';
import type { Banner, BannerType } from '../types/api';

export const bannersApi = {
  list: (type?: BannerType) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return http.get<{ banners: Banner[] }>(`/banners${query}`);
  },
  create: (payload: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => http.post<{ banner: Banner }>('/banners', payload),
  update: (id: string, payload: Partial<Omit<Banner, 'id'>>) => http.put<{ banner: Banner }>(`/banners/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/banners/${id}`),
};
