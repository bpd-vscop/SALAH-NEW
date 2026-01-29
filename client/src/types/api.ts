export type UserRole = 'super_admin' | 'admin' | 'staff' | 'client';
export type UserStatus = 'active' | 'inactive';
export type ClientType = 'B2B' | 'C2B';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
export type ShippingMethod = 'standard' | 'express' | 'overnight';
export type ProductTag = 'coming soon';
export type ProductStatusTag =
  | 'in stock'
  | 'out of stock'
  | 'on sale'
  | 'back in stock'
  | 'new arrival'
  | 'coming soon';
export type ProductInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';
export type ProductType = 'simple' | 'variable' | 'grouped';
export type ProductStatus = 'draft' | 'scheduled' | 'private' | 'published';
export type ProductVisibility = 'catalog' | 'search' | 'hidden' | 'catalog-and-search';
export type CouponType = 'percentage' | 'fixed';
export type ConversationStatus = 'open' | 'closed';
export type MessageSenderRole = 'client' | 'admin';
export type InvoiceStatus = 'pending' | 'completed' | 'canceled';
export type EstimateStatus = InvoiceStatus;

export interface TaxRate {
  id: string;
  country: string | null;
  state: string | null;
  rate: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ConversationClientSummary {
  id: string;
  name: string;
  email: string | null;
  clientType: ClientType | null;
  lastActiveAt?: string | null;
}

export interface Conversation {
  id: string;
  clientId: string;
  recipientEmail: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  lastMessageSenderRole: MessageSenderRole | null;
  lastReadAtClient: string | null;
  lastReadAtAdmin: string | null;
  clientOnlineAt?: string | null;
  unreadCount?: number;
  client?: ConversationClientSummary | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: MessageSenderRole;
  senderUserId: string | null;
  body: string;
  createdAt: string | null;
}

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

export interface ProductReviewReply {
  id: string;
  authorRole: 'client' | 'admin';
  authorId?: string | null;
  authorName?: string | null;
  message: string;
  createdAt?: string | null;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string | null;
  reviewerName: string;
  rating: number;
  comment: string;
  adminComment?: string | null;
  replies?: ProductReviewReply[];
  isVerifiedPurchase?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ReviewerName {
  id: string;
  name: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
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

export interface WishlistItem {
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

export interface BillingAddress {
  fullName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
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
  billingAddress?: BillingAddress | null;
  taxExempt?: boolean | null;
  taxExemptUpdatedAt?: string | null;
  verificationFileUrl?: string | null;
  verificationStatus?: VerificationStatus | null;
  profileImage?: string | null;
  isEmailVerified?: boolean;
  shippingAddresses?: ShippingAddress[];
  cart: CartItem[];
  wishlist: WishlistItem[];
  orderHistory: string[];
  accountCreated?: string | null;
  accountUpdated?: string | null;
  accountUpdatedById?: string | null;
  accountUpdatedByName?: string | null;
  accountUpdatedByRole?: UserRole | null;
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
  categoryIds?: string[];
  manageStock?: boolean;
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
  restockedAt?: string | null;
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
  featured?: boolean;
  newArrival?: boolean;
  requiresB2B?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  amount: number;
  isActive: boolean;
  categoryIds?: string[];
  productIds?: string[];
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

export interface DownloadLink {
  label?: string | null;
  url: string;
}

export interface DownloadEntry {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  links: DownloadLink[];
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
  tagsAtPurchase: ProductStatusTag[];
}

export interface OrderCoupon {
  code: string;
  type: CouponType;
  amount: number;
  discountAmount: number;
  eligibleSubtotal: number;
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
  billingAddress?: BillingAddress | null;
  taxExempt?: boolean | null;
  verificationFileUrl: string | null;
  verificationStatus: VerificationStatus | null;
  profileImage: string | null;
  shippingAddresses: ShippingAddress[];
  accountCreated: string | null;
  accountUpdated: string | null;
}

export interface OrderShipment {
  labelId: string | null;
  shipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrierCode: string | null;
  carrierId: string | null;
  serviceCode: string | null;
  serviceName: string | null;
  labelUrl: string | null;
  shippingCost: number;
  estimatedDelivery: string | null;
  shippedAt: string | null;
}

export interface ShippingRateInfo {
  rateId?: string | null;
  carrierId?: string | null;
  carrierCode?: string | null;
  carrierName?: string | null;
  serviceCode?: string | null;
  serviceName?: string | null;
  deliveryDays?: number | null;
  estimatedDelivery?: string | null;
}

export interface ShippingAddressSnapshot {
  fullName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export type PaymentMethod = 'paypal' | 'stripe' | 'affirm' | 'none';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface PaymentDetails {
  brand: string | null;
  last4: string | null;
}

export interface Order {
  id: string;
  userId: string;
  user?: OrderUserSummary | null;
  products: OrderProductItem[];
  coupon?: OrderCoupon | null;
  subtotal?: number;
  discountAmount?: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  taxCountry?: string | null;
  taxState?: string | null;
  paymentMethod?: PaymentMethod;
  paymentId?: string | null;
  paymentStatus?: PaymentStatus;
  paymentDetails?: PaymentDetails | null;
  status: OrderStatus;
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  shippingRateInfo?: ShippingRateInfo | null;
  shipment?: OrderShipment | null;
  shippingAddressSnapshot?: ShippingAddressSnapshot | null;
  total?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InvoiceAddress {
  companyName?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface InvoiceItem {
  productId?: string | null;
  name: string;
  sku?: string | null;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string | null;
  status: InvoiceStatus;
  billTo: InvoiceAddress;
  shipTo: InvoiceAddress;
  items: InvoiceItem[];
  subtotal: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
  total: number;
  currency?: string | null;
  terms?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  secondPageContent?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId?: string | null;
  status: EstimateStatus;
  billTo: InvoiceAddress;
  shipTo: InvoiceAddress;
  items: InvoiceItem[];
  subtotal: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
  total: number;
  currency?: string | null;
  terms?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  secondPageContent?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}

export type LegalDocumentType = 'privacy-policy' | 'terms-of-service' | 'return-policy' | 'shipping-policy';

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  title: string;
  content: string;
  lastUpdated?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ApiError {
  error: {
    message: string;
    details?: Array<Record<string, unknown>>;
    code?: string;
  };
}
