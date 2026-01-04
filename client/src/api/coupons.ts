import { http } from './http';
import type { Coupon, CouponType } from '../types/api';

export interface CouponPayload {
  code: string;
  type: CouponType;
  amount: number;
  isActive?: boolean;
  categoryIds?: string[];
  productIds?: string[];
}

export const couponsApi = {
  list: () => http.get<{ coupons: Coupon[] }>('/coupons'),
  create: (payload: CouponPayload) => http.post<{ coupon: Coupon }>('/coupons', payload),
  update: (id: string, payload: Partial<CouponPayload>) =>
    http.put<{ coupon: Coupon }>(`/coupons/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/coupons/${id}`),
  validate: (payload: { code: string; items: Array<{ productId: string; quantity: number }> }) =>
    http.post<{
      coupon: Coupon;
      subtotal: number;
      eligibleSubtotal: number;
      discountAmount: number;
      eligibleProductIds: string[];
    }>('/coupons/validate', payload),
};
