import { http } from './http';
import type { Invoice, InvoiceStatus } from '../types/api';

export interface ListInvoicesParams {
  status?: InvoiceStatus | 'all';
  search?: string;
}

export interface CreateInvoicePayload {
  customerId?: string | null;
  billTo: Invoice['billTo'];
  shipTo: Invoice['shipTo'];
  items: Invoice['items'];
  status?: InvoiceStatus;
  taxRate?: number;
  taxAmount?: number;
  shippingAmount?: number;
  currency?: string;
  terms?: string;
  dueDate?: string | null;
  notes?: string;
}

export interface UpdateInvoicePayload {
  status: InvoiceStatus;
}

export const invoicesApi = {
  list: (params?: ListInvoicesParams) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const search = query.toString();
    return http.get<{ invoices: Invoice[] }>(`/invoices${search ? `?${search}` : ''}`);
  },
  get: (id: string) => http.get<{ invoice: Invoice }>(`/invoices/${id}`),
  create: (payload: CreateInvoicePayload) => http.post<{ invoice: Invoice }>('/invoices', payload),
  update: (id: string, payload: UpdateInvoicePayload) =>
    http.patch<{ invoice: Invoice }>(`/invoices/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/invoices/${id}`),
};
