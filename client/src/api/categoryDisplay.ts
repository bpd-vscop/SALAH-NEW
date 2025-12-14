import { http } from './http';

export interface CategoryDisplaySettings {
  homepageCategories: string[];
  allCategoriesHeroImage: string | null;
}

export type UpdateCategoryDisplayPayload = {
  homepageCategories: string[];
  allCategoriesHeroImage?: string | null;
};

export const categoryDisplayApi = {
  get: () => http.get<{ settings: CategoryDisplaySettings }>('/category-display'),
  update: (payload: UpdateCategoryDisplayPayload) => http.put<{ settings: CategoryDisplaySettings }>('/category-display', payload),
  uploadHeroImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/category-display/upload-hero-image', formData);
    return response.data.path;
  },
};
