import type { LegalDocument, LegalDocumentType } from '../types/api';
import { http } from './http';

export const legalDocumentsApi = {
  getByType: (type: LegalDocumentType) =>
    http.get<{ document: LegalDocument }>(`/legal-documents/${type}`),

  list: () =>
    http.get<{ documents: LegalDocument[] }>('/legal-documents'),

  update: (type: LegalDocumentType, data: Partial<LegalDocument>) =>
    http.put<{ document: LegalDocument }>(`/legal-documents/${type}`, data),
};
