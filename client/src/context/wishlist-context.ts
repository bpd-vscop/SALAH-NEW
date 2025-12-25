import { createContext } from 'react';
import type { Product, WishlistItem } from '../types/api';

export interface WishlistLine extends WishlistItem {
  product?: Product;
}

export interface WishlistContextValue {
  items: WishlistLine[];
  syncing: boolean;
  addItem: (item: WishlistItem, product?: Product) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  setItems: (items: WishlistItem[]) => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
