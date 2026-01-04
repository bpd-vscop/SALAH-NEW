import { http } from './http';
import type { Order, OrderStatus } from '../types/api';

export const ordersApi = {
  list: () => http.get<{ orders: Order[] }>('/orders'),
  get: (id: string) => http.get<{ order: Order }>(`/orders/${id}`),
  create: (payload: { products: Array<{ productId: string; quantity: number }>; couponCode?: string }) =>
    http.post<{ order: Order }>('/orders', payload),
  updateStatus: (id: string, status: OrderStatus) => http.patch<{ order: Order }>(`/orders/${id}`, { status }),
};
