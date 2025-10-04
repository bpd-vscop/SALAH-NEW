import { http } from './http';

export const uploadsApi = {
  uploadVerification: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ verificationFileUrl: string }>('/uploads/verification', formData);
  },
};
