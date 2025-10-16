import { http } from './http';

export interface MenuLinkInput {
  id?: string;
  label: string;
  href: string;
  order?: number;
  visible?: boolean;
}

export interface MenuItemInput {
  id?: string;
  categoryId: string;
  productId?: string | null;
  order?: number;
}

export interface MenuSectionInput {
  id?: string;
  name: string;
  icon: string;
  order?: number;
  items?: MenuItemInput[];
  visible?: boolean;
}

export interface MenuSection extends MenuSectionInput {
  items: Array<
    MenuItemInput & {
      category?: { _id: string; name: string; slug?: string | null; imageUrl?: string | null } | null;
      product?: { _id: string; name: string; images?: string[] } | null;
    }
  >;
}

export interface PromoSettings {
  text: string;
  visible: boolean;
}

export interface MenuResponse {
  menu: {
    sections: MenuSection[];
    links: (MenuLinkInput & { id: string })[];
    promo?: PromoSettings;
  };
}

export const menuApi = {
  get: () => http.get<MenuResponse>('/menu'),
  update: (payload: { sections: MenuSectionInput[]; links: MenuLinkInput[]; promo?: PromoSettings }) =>
    http.put<MenuResponse>('/menu', payload),
};

