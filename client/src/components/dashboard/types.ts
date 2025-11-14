import type {
  BannerType,
  ProductInventoryStatus,
  ProductStatus,
  ProductTag,
  ProductType,
  ProductVisibility,
  User,
  UserRole,
} from '../../types/api';
import type { FeaturedVariant } from '../../api/featuredShowcase';

export interface UserFormState {
  name: string;
  username: string;
  role: UserRole;
  status: User['status'];
  password: string;
}

export interface CategoryFormState {
  name: string;
  parentId: string;
  imageUrl: string;
  heroImageUrl: string;
}

export interface CategoryDisplayFormState {
  homepageAssignments: Record<number, string>;
  allCategoriesHeroImage: string;
}

export interface ProductKeyValueRow {
  id: string;
  label: string;
  value: string;
}

export interface ProductDocumentRow {
  id: string;
  label: string;
  url: string;
}

export interface ProductBadgeRow {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface ProductCompatibilityRow {
  id: string;
  yearStart: string;
  yearEnd: string;
  year: string;
  make: string;
  model: string;
  subModel: string;
  engine: string;
  notes: string;
}

export interface ProductVariationRow {
  id: string;
  existingId?: string;
  name: string;
  sku: string;
  attributes: ProductKeyValueRow[];
  price: string;
  salePrice: string;
  stockQuantity: string;
  allowBackorder: boolean;
  image: string;
  weight: string;
}

export interface ProductRatingBreakdownRow {
  id: string;
  rating: string;
  count: string;
}

export interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  productCode: string;
  productType: ProductType | '';
  status: ProductStatus | '';
  visibility: ProductVisibility | '';
  categoryId: string;
  manufacturerId: string;
  manufacturerName: string;
  shortDescription: string;
  description: string;
  price: string;
  salePrice: string;
  saleStartDate: string;
  saleEndDate: string;
  taxClass: string;
  featureHighlights: string[];
  tags: Set<ProductTag>;
  primaryImage: string;
  galleryImages: string[];
  videoUrls: string[];
  packageContents: string[];
  specifications: ProductKeyValueRow[];
  attributes: ProductKeyValueRow[];
  customAttributes: ProductKeyValueRow[];
  variationAttributes: string[];
  variations: ProductVariationRow[];
  documents: ProductDocumentRow[];
  compatibility: ProductCompatibilityRow[];
  relatedProductIds: string[];
  upsellProductIds: string[];
  crossSellProductIds: string[];
  inventory: {
    quantity: string;
    lowStockThreshold: string;
    status: ProductInventoryStatus | '';
    allowBackorder: boolean;
    leadTime: string;
  };
  shipping: {
    weight: string;
    weightUnit: string;
    length: string;
    width: string;
    height: string;
    dimensionUnit: string;
    shippingClass: string;
    hazardous: boolean;
    warehouseLocation: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    openGraphImage: string;
  };
  support: {
    warranty: string;
    returnPolicy: string;
    supportPhone: string;
    supportEmail: string;
    liveChatUrl: string;
    supportHours: string;
  };
  badges: ProductBadgeRow[];
  notes: {
    sales: string;
    internal: string;
  };
  reviewsSummary: {
    averageRating: string;
    reviewCount: string;
    ratingBreakdown: ProductRatingBreakdownRow[];
  };
}

export interface BannerFormState {
  type: BannerType;
  imageUrl: string;
  text: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
}

export interface HeroSlideFormState {
  title: string;
  subtitle: string;
  caption: string;
  ctaText: string;
  linkUrl: string;
  order: number;
  desktopImage: string;
  mobileImage: string;
  altText: string;
}

export interface FeatureFormState {
  variant: FeaturedVariant;
  title: string;
  subtitle: string;
  category: string;
  offer: string;
  badgeText: string;
  ctaText: string;
  linkUrl: string;
  price: string;
  order: number;
  image: string;
  altText: string;
}

export type DeleteConfirmationState =
  | { type: 'hero' | 'featured'; id: string }
  | { type: 'category'; id: string }
  | { type: 'product'; id: string }
  | { type: 'menu-section'; id: string } // id is index (as string)
  | { type: 'menu-link'; id: string }    // id is index (as string)
  | null;

export type OrderConflictState =
  | {
      type: 'hero' | 'featured' | 'categorydisplay';
      order: number;
      existingTitle: string;
      onConfirm: () => void;
    }
  | null;

export type StatusSetter = (message: string | null, errorMessage?: string | null) => void;
