import { http } from './http';

export const uploadsApi = {
  uploadVerification: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ verificationFileUrl: string }>('/uploads/verification', formData);
  },
  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ profileImageUrl: string }>('/uploads/profile-image', formData);
  },
};
