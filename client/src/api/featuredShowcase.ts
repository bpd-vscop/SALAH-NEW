import { http } from './http';

export type FeaturedVariant = 'feature' | 'tile';

export interface FeaturedShowcasePayload {
  variant: FeaturedVariant;
  title: string;
  subtitle?: string;
  category?: string;
  offer?: string;
  badgeText?: string;
  ctaText?: string;
  linkUrl: string;
  price?: string;
  image: string;
  order?: number;
  altText?: string;
}

export interface FeaturedShowcaseItem extends FeaturedShowcasePayload {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export const featuredShowcaseApi = {
  list: () => http.get<{ items: FeaturedShowcaseItem[] }>('/featured-showcase'),
  create: (payload: FeaturedShowcasePayload) =>
    http.post<{ item: FeaturedShowcaseItem }>('/featured-showcase', payload),
  update: (id: string, payload: Partial<FeaturedShowcasePayload>) =>
    http.put<{ item: FeaturedShowcaseItem }>(`/featured-showcase/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/featured-showcase/${id}`),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/featured-showcase/upload-image', formData);
    return response.data.path;
  },
};
