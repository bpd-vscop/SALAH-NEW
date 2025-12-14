import { http } from './http';

export interface ManufacturerDisplaySettings {
  homepageManufacturers: string[]; // array of manufacturer ids in order
  allManufacturersHeroImage: string | null; // /uploads path or null
}

export type UpdateManufacturerDisplayPayload = {
  homepageManufacturers: string[];
  allManufacturersHeroImage?: string | null;
};

export const manufacturerDisplayApi = {
  get: () => http.get<{ settings: ManufacturerDisplaySettings }>("/manufacturer-display"),
  update: (payload: UpdateManufacturerDisplayPayload) =>
    http.put<{ settings: ManufacturerDisplaySettings }>("/manufacturer-display", payload),
  uploadHeroImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/manufacturer-display/upload-hero-image', formData);
    return response.data.path;
  },
};
