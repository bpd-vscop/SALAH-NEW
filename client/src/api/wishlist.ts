import { http } from './http';
import type { WishlistItem } from '../types/api';

export const wishlistApi = {
  get: () => http.get<{ wishlist: WishlistItem[] }>('/wishlist'),
  update: (items: WishlistItem[]) => http.put<{ wishlist: WishlistItem[] }>('/wishlist', { items }),
};
