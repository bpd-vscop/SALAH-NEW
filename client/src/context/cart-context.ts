import { createContext } from 'react';
import type { CartItem, Product } from '../types/api';

export interface CartLine extends CartItem {
  product?: Product;
}

export interface CartContextValue {
  items: CartLine[];
  syncing: boolean;
  addItem: (item: CartItem, product?: Product) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setItems: (items: CartItem[]) => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

