import type { Product, ProductStatusTag } from '../types/api';

export type EffectiveInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_ARRIVAL_DAYS = 30;
const COMING_SOON_TAG = 'coming soon';

export const isComingSoon = (product: Product): boolean =>
  Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG);

export const isOnSale = (product: Product, now: Date = new Date()): boolean => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }

  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

export const getEffectivePrice = (product?: Product, now: Date = new Date()): number => {
  if (!product) {
    return 0;
  }
  if (isOnSale(product, now) && typeof product.salePrice === 'number') {
    return product.salePrice;
  }
  return typeof product.price === 'number' ? product.price : 0;
};

export const isNewArrival = (product: Product, now: Date = new Date()): boolean => {
  if (isComingSoon(product)) {
    return false;
  }
  if (product.restockedAt) {
    return false;
  }
  if (!product.createdAt) {
    return false;
  }
  const createdAt = new Date(product.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }
  const diff = now.getTime() - createdAt.getTime();
  return diff >= 0 && diff <= NEW_ARRIVAL_DAYS * DAY_MS;
};

export const isInStock = (product: Product): boolean => {
  if (isComingSoon(product)) {
    return false;
  }
  if (product.manageStock === false) {
    return true;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity > 0;
};

export const isOutOfStock = (product: Product): boolean => {
  if (isComingSoon(product)) {
    return false;
  }
  if (product.manageStock === false) {
    return false;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity <= 0;
};

export const isBackInStock = (product: Product): boolean => {
  if (product.manageStock === false) {
    return false;
  }
  if (!product.restockedAt) {
    return false;
  }
  return isInStock(product);
};

export const getEffectiveInventoryStatus = (product: Product): EffectiveInventoryStatus => {
  if (product.manageStock === false) {
    return 'in_stock';
  }

  const status = (product.inventory?.status ?? 'in_stock') as EffectiveInventoryStatus;
  const allowBackorder = Boolean(product.inventory?.allowBackorder);
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  const lowStockThreshold =
    typeof product.inventory?.lowStockThreshold === 'number' ? product.inventory.lowStockThreshold : 0;

  if (status === 'preorder') {
    return 'preorder';
  }

  if (status === 'backorder' && quantity <= 0) {
    return 'backorder';
  }

  if (allowBackorder && quantity <= 0) {
    return 'backorder';
  }

  if (status === 'out_of_stock' || quantity <= 0) {
    return 'out_of_stock';
  }

  if (status === 'low_stock' || (lowStockThreshold > 0 && quantity <= lowStockThreshold)) {
    return 'low_stock';
  }

  return 'in_stock';
};

export const getProductStatusTags = (product: Product, now: Date = new Date()): ProductStatusTag[] => {
  if (isComingSoon(product)) {
    return ['coming soon'];
  }

  const tags: ProductStatusTag[] = [];

  if (isOnSale(product, now)) {
    tags.push('on sale');
  }

  if (isBackInStock(product)) {
    tags.push('back in stock');
  }

  if (isNewArrival(product, now)) {
    tags.push('new arrival');
  }

  if (isOutOfStock(product)) {
    tags.push('out of stock');
  } else if (isInStock(product)) {
    tags.push('in stock');
  }

  return tags;
};
