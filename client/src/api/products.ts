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
  list: (params?: { categoryId?: string; tags?: ProductTag[]; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) {
      query.append('categoryId', params.categoryId);
    }
    if (params?.tags?.length) {
      query.append('tags', params.tags.join(','));
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const search = query.toString();
    return http.get<{ products: Product[] }>(`/products${search ? `?${search}` : ''}`);
  },
  get: (id: string) => http.get<{ product: Product }>(`/products/${id}`),
  create: (payload: ProductInput) => http.post<{ product: Product }>('/products', payload),
  update: (id: string, payload: UpdateProductInput) => http.put<{ product: Product }>(`/products/${id}`, payload),
  delete: (id: string) => http.delete<void>(`/products/${id}`),
};
