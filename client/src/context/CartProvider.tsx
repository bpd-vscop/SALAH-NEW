import { useCallback, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../api/cart';
import type { CartItem } from '../types/api';
import { useAuth } from './useAuth';
import { CartContext, type CartContextValue, type CartLine } from './cart-context';

const STORAGE_KEY = 'salah-store-cart';

const sanitizeStoredCart = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is CartItem =>
      item && typeof item.productId === 'string' && typeof item.quantity === 'number'
  );
};

const readStoredCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return sanitizeStoredCart(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to parse stored cart', error);
    return [];
  }
};

const writeStoredCart = (items: CartLine[]) => {
  try {
    const serialized = JSON.stringify(
      items.map<CartItem>(({ productId, quantity }) => ({ productId, quantity }))
    );
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to persist cart', error);
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const [items, setItemsState] = useState<CartLine[]>(() => readStoredCart());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (user) {
      // Only clients maintain a cart; clear for staff/admin
      setItemsState(user.role === 'client' ? (user.cart ?? []) : []);
    }
  }, [user, initializing]);

  useEffect(() => {
    writeStoredCart(items);
  }, [items]);

  const syncIfNeeded = useCallback(
    async (nextItems: CartItem[]) => {
      if (!user || user.role !== 'client') {
        return;
      }
      setSyncing(true);
      try {
        // Send update to server but don't replace local state
        // to avoid race conditions when adding items quickly
        await cartApi.update(nextItems);
      } finally {
        setSyncing(false);
      }
    },
    [user]
  );

  const addItem = useCallback<CartContextValue['addItem']>(
    async (item, product) => {
      let nextItems: CartLine[] = [];
      setItemsState((current) => {
        const existingIndex = current.findIndex((line) => line.productId === item.productId);
        if (existingIndex >= 0) {
          nextItems = current.map((line, index) =>
            index === existingIndex
              ? {
                  ...line,
                  quantity: line.quantity + item.quantity,
                  product: product ?? line.product,
                }
              : line
          );
        } else {
          nextItems = [...current, { ...item, product }];
        }
        return nextItems;
      });

      await syncIfNeeded(nextItems.map<CartItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const updateItem = useCallback<CartContextValue['updateItem']>(
    async (productId, quantity) => {
      let nextItems: CartLine[] = [];
      const normalized = Math.max(1, Math.round(quantity));
      setItemsState((current) => {
        nextItems = current.map((line) =>
          line.productId === productId ? { ...line, quantity: normalized } : line
        );
        return nextItems;
      });

      await syncIfNeeded(nextItems.map<CartItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const removeItem = useCallback<CartContextValue['removeItem']>(
    async (productId) => {
      let nextItems: CartLine[] = [];
      setItemsState((current) => {
        nextItems = current.filter((line) => line.productId !== productId);
        return nextItems;
      });

      await syncIfNeeded(nextItems.map<CartItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const clearCart = useCallback(async () => {
    setItemsState([]);
    await syncIfNeeded([]);
  }, [syncIfNeeded]);

  const setItems = useCallback<CartContextValue['setItems']>(
    async (nextItems) => {
      setItemsState(nextItems);
      await syncIfNeeded(nextItems);
    },
    [syncIfNeeded]
  );

  const loadFromServer = useCallback(async () => {
    if (!user || user.role !== 'client') {
      return;
    }
    setSyncing(true);
    try {
      const { cart } = await cartApi.get();
      setItemsState(cart);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const value = useMemo<CartContextValue>(
    () => ({ items, syncing, addItem, updateItem, removeItem, clearCart, setItems, loadFromServer }),
    [items, syncing, addItem, updateItem, removeItem, clearCart, setItems, loadFromServer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
