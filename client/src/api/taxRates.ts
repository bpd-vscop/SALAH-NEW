import { http } from './http';
import type { TaxRate } from '../types/api';

export interface TaxRatePayload {
  country?: string | null;
  state?: string | null;
  rate: number;
}

export const taxRatesApi = {
  list: () => http.get<{ taxRates: TaxRate[] }>('/tax-rates'),
  create: (payload: TaxRatePayload) => http.post<{ taxRate: TaxRate }>('/tax-rates', payload),
  update: (id: string, payload: Partial<TaxRatePayload>) =>
    http.put<{ taxRate: TaxRate }>(`/tax-rates/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/tax-rates/${id}`),
  lookup: (params?: { country?: string; state?: string }) => {
    const search = new URLSearchParams();
    if (params?.country) search.set('country', params.country);
    if (params?.state) search.set('state', params.state);
    const query = search.toString();
    return http.get<{ taxRate: TaxRate | null }>(`/tax-rates/lookup${query ? `?${query}` : ''}`);
  },
};
