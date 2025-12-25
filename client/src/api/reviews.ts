import { http } from './http';
import type { ProductReview, ProductReviewsSummary } from '../types/api';

export const reviewsApi = {
  listByProduct: (productId: string) =>
    http.get<{ reviews: ProductReview[] }>(`/products/${productId}/reviews`),
  createForProduct: (productId: string, payload: { rating: number; comment: string; reviewerName?: string }) =>
    http.post<{ review: ProductReview; summary?: ProductReviewsSummary }>(`/products/${productId}/reviews`, payload),
  list: (params?: { productId?: string; mine?: boolean; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.append('productId', params.productId);
    if (params?.mine) query.append('mine', 'true');
    if (typeof params?.page === 'number') query.append('page', params.page.toString());
    if (typeof params?.limit === 'number') query.append('limit', params.limit.toString());
    const search = query.toString();
    return http.get<{ reviews: ProductReview[]; total?: number; page?: number; limit?: number }>(
      `/reviews${search ? `?${search}` : ''}`
    );
  },
  update: (id: string, payload: { adminComment?: string; rating?: number; comment?: string }) =>
    http.patch<{ review: ProductReview; summary?: ProductReviewsSummary }>(`/reviews/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/reviews/${id}`),
  bulkDelete: (ids: string[]) => http.post<{ deleted: number }>('/reviews/bulk-delete', { ids }),
};
