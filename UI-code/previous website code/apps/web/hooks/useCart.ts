// filepath: apps/web/hooks/useCart.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

// Cart item interface
export interface CartItem {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  quantity: number;
  image: string;
  slug: string;
  sku: string;
  maxQuantity?: number;
}

// Cart summary interface
export interface CartSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
}

// Cart hook
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('ulks-cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('ulks-cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items]);

  // Add item to cart
  const addItem = useCallback((product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setIsLoading(true);
    
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        const newQuantity = existingItem.quantity + quantity;
        const maxQty = product.maxQuantity || 99;
        
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(newQuantity, maxQty) }
            : item
        );
      } else {
        // Add new item
        return [...currentItems, { ...product, quantity }];
      }
    });
    
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  // Remove item from cart
  const removeItem = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== productId));
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.id === productId) {
          const maxQty = item.maxQuantity || 99;
          return { ...item, quantity: Math.min(quantity, maxQty) };
        }
        return item;
      })
    );
  }, [removeItem]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Get item by ID
  const getItem = useCallback((productId: string) => {
    return items.find(item => item.id === productId);
  }, [items]);

  // Check if item is in cart
  const isInCart = useCallback((productId: string) => {
    return items.some(item => item.id === productId);
  }, [items]);

  // Calculate cart summary
  const summary: CartSummary = {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => {
      const price = item.salePrice || item.price;
      return sum + (price * item.quantity);
    }, 0),
    tax: 0, // Will be calculated based on shipping address
    shipping: 0, // Will be calculated based on items and location
    get total() {
      return this.subtotal + this.tax + this.shipping;
    }
  };

  return {
    items,
    summary,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItem,
    isInCart,
  };
}
