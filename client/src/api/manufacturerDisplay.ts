import { http } from './http';

export interface ManufacturerDisplaySettings {
  homepageManufacturers: string[]; // array of manufacturer ids in order
  allManufacturersHeroImage: string | null; // base64 data URL or URL
}

export const manufacturerDisplayApi = {
  get: () => http.get<{ settings: ManufacturerDisplaySettings }>("/manufacturer-display"),
  update: (payload: ManufacturerDisplaySettings) =>
    http.put<{ settings: ManufacturerDisplaySettings }>("/manufacturer-display", payload),
};

