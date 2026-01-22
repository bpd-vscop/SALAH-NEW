import { http } from './http';

export interface ShipEngineCarrier {
    name: string;
    carrierId: string;
    carrierCode?: string | null;
    isEnabled: boolean;
}

export interface ShipFromAddress {
    name?: string;
    companyName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface ShipEngineSettings {
    id: string;
    apiKeyMasked: string;
    hasApiKey: boolean;
    warehouseId: string;
    isSandbox: boolean;
    carriers: ShipEngineCarrier[];
    defaultCarrierId: string;
    shipFromAddress?: ShipFromAddress | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface UpdateShipEngineSettingsPayload {
    apiKey?: string;
    warehouseId?: string;
    isSandbox?: boolean;
    carriers?: ShipEngineCarrier[];
    defaultCarrierId?: string;
    shipFromAddress?: ShipFromAddress;
}

export interface TestConnectionResponse {
    success: boolean;
    message: string;
    carriers?: Array<{
        carrierId: string;
        name: string;
        carrierCode: string;
    }>;
}

export interface ShippingRate {
    rateId: string;
    carrierId: string;
    carrierCode: string;
    carrierName: string;
    serviceCode: string;
    serviceName: string;
    price: number;
    currency: string;
    deliveryDays: number | null;
    estimatedDelivery: string | null;
    carrierDeliveryDays: string | null;
    isGuaranteed: boolean;
}

export interface ShipToAddress {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface GetRatesPayload {
    shipTo: ShipToAddress;
    packages?: Array<{
        weight?: number;
        weightUnit?: string;
        dimensions?: {
            length?: number;
            width?: number;
            height?: number;
            unit?: string;
        };
    }>;
}

export interface GetRatesResponse {
    success: boolean;
    message?: string;
    rates: ShippingRate[];
    shipmentId?: string;
}

export const shipEngineSettingsApi = {
    get: () => http.get<{ settings: ShipEngineSettings }>('/admin/shipengine-settings'),
    update: (payload: UpdateShipEngineSettingsPayload) =>
        http.put<{ settings: ShipEngineSettings; message: string }>('/admin/shipengine-settings', payload),
    testConnection: () => http.post<TestConnectionResponse>('/admin/shipengine-settings/test', {}),
};

export const shippingApi = {
    getRates: (payload: GetRatesPayload) => http.post<GetRatesResponse>('/shipping/rates', payload),
};
