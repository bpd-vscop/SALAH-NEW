import { http } from './http';
import type {
  Product,
  ProductBadge,
  ProductCompatibilityEntry,
  ProductDocument,
  ProductInventory,
  ProductNotes,
  ProductReviewsSummary,
  ProductSeo,
  ProductSerialNumber,
  ProductShipping,
  ProductSpecification,
  ProductSupportDetails,
  ProductTag,
  ProductVariation,
} from '../types/api';

interface ProductPayload {
  slug?: string | null;
  sku?: string | null;
  productCode?: string | null;
  productType?: Product['productType'];
  status?: Product['status'];
  visibility?: Product['visibility'];
  manufacturerId?: string | null;
  manufacturerName?: string | null;
  tags?: ProductTag[];
  shortDescription?: string | null;
  description?: string;
  images?: string[];
  videoUrls?: string[];
  price?: number;
  requiresB2B?: boolean;
  cost?: number | null;
  salePrice?: number | null;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  taxClass?: string | null;
  featureHighlights?: string[];
  inventory?: ProductInventory | null;
  shipping?: ProductShipping | null;
  packageContents?: string[];
  specifications?: ProductSpecification[];
  attributes?: Record<string, string>;
  customAttributes?: Record<string, string>;
  variationAttributes?: string[];
  variations?: ProductVariation[];
  documents?: ProductDocument[];
  compatibility?: ProductCompatibilityEntry[];
  relatedProductIds?: string[];
  upsellProductIds?: string[];
  crossSellProductIds?: string[];
  seo?: ProductSeo | null;
  badges?: ProductBadge[];
  support?: ProductSupportDetails | null;
  reviewsSummary?: ProductReviewsSummary | null;
  notes?: ProductNotes | null;
  serialNumbers?: Array<{
    _id?: string;
    serialNumber: string;
    status?: ProductSerialNumber['status'];
    soldDate?: string | null;
    orderId?: string | null;
    notes?: string | null;
  }>;
}

export interface ProductInput extends ProductPayload {
  name: string;
  categoryId: string;
}

export type UpdateProductInput = Partial<ProductPayload> & {
  name?: string;
  categoryId?: string;
};

export const productsApi = {
  list: (params?: {
    categoryId?: string;
    manufacturerId?: string;
    manufacturerIds?: string[];
    tags?: ProductTag[];
    search?: string;
    includeSerials?: boolean;
    minPrice?: number;
    maxPrice?: number;
    vehicleYear?: string;
    vehicleMake?: string;
    vehicleModel?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) {
      query.append('categoryId', params.categoryId);
    }
    if (params?.manufacturerId) {
      query.append('manufacturerId', params.manufacturerId);
    }
    if (params?.manufacturerIds?.length) {
      query.append('manufacturerIds', params.manufacturerIds.join(','));
    }
    if (params?.tags?.length) {
      query.append('tags', params.tags.join(','));
    }
    if (params?.includeSerials) {
      query.append('includeSerials', 'true');
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    if (params?.minPrice !== undefined) {
      query.append('minPrice', params.minPrice.toString());
    }
    if (params?.maxPrice !== undefined) {
      query.append('maxPrice', params.maxPrice.toString());
    }
    if (params?.vehicleYear) {
      query.append('vehicleYear', params.vehicleYear);
    }
    if (params?.vehicleMake) {
      query.append('vehicleMake', params.vehicleMake);
    }
    if (params?.vehicleModel) {
      query.append('vehicleModel', params.vehicleModel);
    }
    const search = query.toString();
    return http.get<{ products: Product[] }>(`/products${search ? `?${search}` : ''}`);
  },
  getVehicleCompatibilityOptions: (params?: { make?: string; model?: string }) => {
    const query = new URLSearchParams();
    if (params?.make) {
      query.append('make', params.make);
    }
    if (params?.model) {
      query.append('model', params.model);
    }
    const search = query.toString();
    return http.get<{ makes: string[]; models: string[]; years: number[] }>(
      `/products/vehicle-compatibility-options${search ? `?${search}` : ''}`
    );
  },
  get: (id: string) => http.get<{ product: Product }>(`/products/${id}`),
  create: (payload: ProductInput) => http.post<{ product: Product }>('/products', payload),
  update: (id: string, payload: UpdateProductInput) => http.put<{ product: Product }>(`/products/${id}`, payload),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await http.post<{ data: { path: string } }>('/products/upload-image', formData);
    return response.data.path;
  },
  delete: (id: string) => http.delete<void>(`/products/${id}`),
};
