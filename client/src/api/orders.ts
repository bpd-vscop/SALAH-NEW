import { http } from './http';
import type { Order, OrderStatus } from '../types/api';

export type ShippingMethod = 'standard' | 'express' | 'overnight';

export interface ShippingRatePayload {
  rateId: string;
  carrierId?: string;
  carrierCode?: string;
  carrierName: string;
  serviceCode?: string;
  serviceName: string;
  price: number;
  currency?: string;
  deliveryDays?: number | null;
  estimatedDelivery?: string | null;
}

export interface CreateOrderPayload {
  products: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
  shippingMethod?: ShippingMethod;
  shippingAddressId?: string;
  shippingRate?: ShippingRatePayload;
}

export interface TrackingEvent {
  occurredAt: string;
  description: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  statusCode: string | null;
  statusDescription: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TrackingInfo {
  trackingNumber: string;
  trackingUrl: string | null;
  carrierCode: string;
  statusCode: string;
  statusDescription: string;
  carrierStatusCode: string | null;
  carrierStatusDescription: string | null;
  shipDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  exceptionDescription: string | null;
  events: TrackingEvent[];
}

export interface OrderTrackingResponse {
  hasTracking: boolean;
  orderId?: string;
  message?: string;
  shipment: Order['shipment'] | null;
  tracking?: TrackingInfo | null;
  trackingError?: string;
}

export const ordersApi = {
  list: () => http.get<{ orders: Order[] }>('/orders'),
  get: (id: string) => http.get<{ order: Order }>(`/orders/${id}`),
  create: (payload: CreateOrderPayload) =>
    http.post<{ order: Order }>('/orders', payload),
  updateStatus: (id: string, status: OrderStatus) => http.patch<{ order: Order }>(`/orders/${id}`, { status }),
  getTracking: (id: string) => http.get<OrderTrackingResponse>(`/orders/${id}/tracking`),
};

