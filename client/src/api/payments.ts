import { http } from './http';
import type { ShippingMethod, ShippingRatePayload } from './orders';

export interface PaymentMethodConfig {
    id: string;
    name: string;
    description: string;
}

export interface PaymentConfigResponse {
    methods: PaymentMethodConfig[];
    paypal: { clientId: string; mode: string } | null;
    stripe: { publishableKey: string } | null;
}

export interface PaypalOrderResponse {
    paypalOrderId: string;
    status: string;
}

export interface PaypalCaptureResponse {
    success: boolean;
    captureId: string | null;
    status: string;
}

export interface StripePaymentIntentPayload {
    products: Array<{ productId: string; quantity: number }>;
    couponCode?: string;
    shippingMethod?: ShippingMethod;
    shippingAddressId?: string;
    shippingRate?: ShippingRatePayload;
}

export interface StripePaymentIntentResponse {
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
}

export const paymentsApi = {
    getConfig: () => http.get<PaymentConfigResponse>('/payments/config'),

    createPaypalOrder: (amount: number, currency = 'USD') =>
        http.post<PaypalOrderResponse>('/payments/paypal/create-order', {
            amount,
            currency,
        }),

    capturePaypalOrder: (paypalOrderId: string) =>
        http.post<PaypalCaptureResponse>('/payments/paypal/capture', {
            paypalOrderId,
        }),

    createStripePaymentIntent: (payload: StripePaymentIntentPayload) =>
        http.post<StripePaymentIntentResponse>('/payments/stripe/create-intent', payload),
};
