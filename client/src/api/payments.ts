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
    affirm: { publicKey: string; mode: string; scriptUrl: string; minTotal: number } | null;
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

export type AffirmCheckoutObject = Record<string, unknown>;

export interface AffirmCheckoutResponse {
    checkout: AffirmCheckoutObject;
    orderId: string;
    total: number;
    currency: string;
}

export interface AffirmAuthorizePayload extends StripePaymentIntentPayload {
    checkoutToken: string;
    orderId: string;
}

export interface AffirmAuthorizeResponse {
    transactionId: string;
    status: string;
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

    createAffirmCheckout: (payload: StripePaymentIntentPayload) =>
        http.post<AffirmCheckoutResponse>('/payments/affirm/checkout', payload),

    authorizeAffirmTransaction: (payload: AffirmAuthorizePayload) =>
        http.post<AffirmAuthorizeResponse>('/payments/affirm/authorize', payload),
};
