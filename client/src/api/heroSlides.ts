import { http } from './http';

export interface HeroSlidePayload {
  title: string;
  subtitle?: string;
  caption?: string;
  ctaText?: string;
  linkUrl: string;
  desktopImage: string;
  mobileImage: string;
  order?: number;
  altText?: string;
}

export interface HeroSlide extends HeroSlidePayload {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export const heroSlidesApi = {
  list: () => http.get<{ slides: HeroSlide[] }>('/hero-slides'),
  create: (payload: HeroSlidePayload) => http.post<{ slide: HeroSlide }>('/hero-slides', payload),
  update: (id: string, payload: Partial<HeroSlidePayload>) =>
    http.put<{ slide: HeroSlide }>(`/hero-slides/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/hero-slides/${id}`),
};

