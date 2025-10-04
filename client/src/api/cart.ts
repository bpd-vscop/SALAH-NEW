import { http } from './http';
import type { CartItem } from '../types/api';

export const cartApi = {
  get: () => http.get<{ cart: CartItem[] }>('/cart'),
  update: (items: CartItem[]) => http.put<{ cart: CartItem[] }>('/cart', { items }),
};
