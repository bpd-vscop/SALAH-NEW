import { http } from './http';

export interface PaymentMethodConfig {
    id: string;
    name: string;
    description: string;
}

export interface PaymentConfigResponse {
    methods: PaymentMethodConfig[];
    paypal: { clientId: string; mode: string } | null;
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
};
