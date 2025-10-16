import { http } from './http';

export interface CategoryDisplaySettings {
  homepageCategories: string[];
  allCategoriesHeroImage: string | null;
}

export const categoryDisplayApi = {
  get: () => http.get<{ settings: CategoryDisplaySettings }>('/category-display'),
  update: (payload: CategoryDisplaySettings) => http.put<{ settings: CategoryDisplaySettings }>('/category-display', payload),
};
