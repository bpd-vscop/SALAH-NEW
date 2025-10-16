export type UserRole = 'super_admin' | 'admin' | 'staff' | 'client';
export type UserStatus = 'active' | 'inactive';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type ProductTag = 'in stock' | 'out of stock' | 'on sale' | 'available to order';

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  verificationFileUrl?: string | null;
  cart: CartItem[];
  orderHistory: string[];
  accountCreated?: string | null;
  accountUpdated?: string | null;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  tags: ProductTag[];
  description: string;
  images: string[];
  price: number;
  attributes?: Record<string, string> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  slug?: string | null;
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

export interface Order {
  id: string;
  userId: string;
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
