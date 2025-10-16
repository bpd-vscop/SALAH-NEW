import type { BannerType, ProductTag, User, UserRole } from '../../types/api';
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

export interface ProductFormState {
  name: string;
  categoryId: string;
  price: number;
  tags: Set<ProductTag>;
  description: string;
  images: string;
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

export type DeleteConfirmationState = { type: 'hero' | 'featured'; id: string } | null;

export type OrderConflictState =
  | {
      type: 'hero' | 'featured';
      order: number;
      existingTitle: string;
      onConfirm: () => void;
    }
  | null;

export type StatusSetter = (message: string | null, errorMessage?: string | null) => void;
