import { http } from './http';
import type { Estimate, EstimateStatus } from '../types/api';

export interface ListEstimatesParams {
  status?: EstimateStatus | 'all';
  search?: string;
}

export interface CreateEstimatePayload {
  customerId?: string | null;
  billTo: Estimate['billTo'];
  shipTo: Estimate['shipTo'];
  items: Estimate['items'];
  status?: EstimateStatus;
  taxRate?: number;
  taxAmount?: number;
  shippingAmount?: number;
  currency?: string;
  terms?: string;
  dueDate?: string | null;
  notes?: string;
}

export interface UpdateEstimatePayload {
  status: EstimateStatus;
}

export const estimatesApi = {
  list: (params?: ListEstimatesParams) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const search = query.toString();
    return http.get<{ estimates: Estimate[] }>(`/estimates${search ? `?${search}` : ''}`);
  },
  get: (id: string) => http.get<{ estimate: Estimate }>(`/estimates/${id}`),
  create: (payload: CreateEstimatePayload) => http.post<{ estimate: Estimate }>('/estimates', payload),
  update: (id: string, payload: UpdateEstimatePayload) =>
    http.patch<{ estimate: Estimate }>(`/estimates/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/estimates/${id}`),
};
