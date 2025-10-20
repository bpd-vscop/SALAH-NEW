import { http } from './http';
import type { ClientType } from '../types/api';

export interface ClientRegistrationPayload {
  clientType: ClientType;
  basicInfo: {
    fullName: string;
    email: string;
    password: string;
  };
  companyInfo?: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    businessType?: string;
    taxId?: string;
    companyWebsite?: string;
  };
}

export interface ClientRegistrationResponse {
  email: string;
  clientType: ClientType;
  expiresAt: string;
  requiresVerification: boolean;
  previewCode?: string;
}

export const clientsApi = {
  register: (payload: ClientRegistrationPayload) =>
    http.post<ClientRegistrationResponse>('/clients/register', payload),
};
