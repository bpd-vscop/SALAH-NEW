import { http } from './http';
import type { ReviewerName } from '../types/api';

export const reviewerNamesApi = {
  list: () => http.get<{ names: ReviewerName[] }>('/reviewer-names'),
  create: (payload: { name: string }) =>
    http.post<{ name: ReviewerName }>('/reviewer-names', payload),
  delete: (id: string) => http.delete<void>(`/reviewer-names/${id}`),
};
