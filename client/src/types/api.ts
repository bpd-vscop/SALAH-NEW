export type UserRole = 'super_admin' | 'admin' | 'staff' | 'client';
export type UserStatus = 'active' | 'inactive';
export type ClientType = 'B2B' | 'C2B';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type ProductTag = 'in stock' | 'out of stock' | 'on sale' | 'available to order';
export type ProductInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';
export type ProductType = 'simple' | 'variable' | 'grouped';
export type ProductStatus = 'draft' | 'scheduled' | 'private' | 'published';
export type ProductVisibility = 'catalog' | 'search' | 'hidden' | 'catalog-and-search';

export interface ProductInventory {
  quantity?: number;
  lowStockThreshold?: number;
  status?: ProductInventoryStatus;
  allowBackorder?: boolean;
  leadTime?: string | null;
}

export interface ProductShippingDimensions {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: string | null;
}

export interface ProductShipping {
  weight?: number | null;
  weightUnit?: string | null;
  dimensions?: ProductShippingDimensions | null;
  shippingClass?: string | null;
  hazardous?: boolean;
  warehouseLocation?: string | null;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductDocument {
  label: string;
  url: string;
}

export interface ProductCompatibilityEntry {
  yearStart?: number;
  yearEnd?: number;
  year?: number;
  make: string;
  model: string;
  subModel?: string;
  engine?: string;
  notes?: string;
}

export interface ProductVariation {
  id?: string;
  sku?: string;
  name?: string;
  attributes?: Record<string, string>;
  price?: number | null;
  salePrice?: number | null;
  stockQuantity?: number | null;
  allowBackorder?: boolean;
  image?: string | null;
  weight?: number | null;
}

export interface ProductSerialNumber {
  id?: string;
  serialNumber: string;
  status?: 'available' | 'sold' | 'reserved' | 'defective' | 'returned';
  soldDate?: string | null;
  orderId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductBadge {
  label: string;
  description?: string;
  icon?: string;
}

export interface ProductSupportDetails {
  warranty?: string;
  returnPolicy?: string;
  supportPhone?: string;
  supportEmail?: string;
  liveChatUrl?: string;
  supportHours?: string;
}

export interface ProductReviewsSummary {
  averageRating?: number | null;
  reviewCount?: number | null;
  ratingBreakdown?: Record<string, number>;
}

export interface ProductSeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  openGraphImage?: string;
}

export interface ProductNotes {
  sales?: string;
  internal?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CompanyInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  businessType?: string | null;
  taxId?: string | null;
  website?: string | null;
}

export interface ShippingAddress {
  id: string;
  fullName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  email?: string | null;
  phoneCode?: string | null;
  phoneNumber?: string | null;
  clientType?: ClientType | null;
  company?: CompanyInfo | null;
  verificationFileUrl?: string | null;
  profileImage?: string | null;
  isEmailVerified?: boolean;
  shippingAddresses?: ShippingAddress[];
  cart: CartItem[];
  orderHistory: string[];
  accountCreated?: string | null;
  accountUpdated?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug?: string | null;
  sku?: string | null;
  productCode?: string | null;
  productType?: ProductType;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  categoryId: string;
  manufacturerId?: string | null;
  manufacturerName?: string | null;
  tags: ProductTag[];
  shortDescription?: string | null;
  description: string;
  images: string[];
  videoUrls?: string[];
  price: number;
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
  attributes?: Record<string, string> | null;
  customAttributes?: Record<string, string> | null;
  variationAttributes?: string[];
  variations?: ProductVariation[];
  serialNumbers?: ProductSerialNumber[];
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
  requiresB2B?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  heroImageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type BannerType = 'slide' | 'row' | 'advertising';

export interface Banner {
  id: string;
  type: BannerType;
  imageUrl: string;
  linkUrl?: string | null;
  text?: string | null;
  order?: number;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OrderProductItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  tagsAtPurchase: ProductTag[];
}

export interface OrderUserSummary {
  id: string | null;
  name: string | null;
  email: string | null;
  phoneCode: string | null;
  phoneNumber: string | null;
  clientType: ClientType | null;
  status: UserStatus | null;
  isEmailVerified: boolean | null;
  company: CompanyInfo | null;
  verificationFileUrl: string | null;
  profileImage: string | null;
  shippingAddresses: ShippingAddress[];
  accountCreated: string | null;
  accountUpdated: string | null;
}

export interface Order {
  id: string;
  userId: string;
  user?: OrderUserSummary | null;
  products: OrderProductItem[];
  status: OrderStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiError {
  error: {
    message: string;
    details?: Array<Record<string, unknown>>;
    code?: string;
  };
}
