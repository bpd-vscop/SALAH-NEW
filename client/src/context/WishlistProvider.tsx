import { useCallback, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '../api/wishlist';
import type { WishlistItem } from '../types/api';
import { useAuth } from './useAuth';
import { WishlistContext, type WishlistContextValue, type WishlistLine } from './wishlist-context';

const STORAGE_KEY = 'salah-store-wishlist';

const sanitizeStoredWishlist = (raw: unknown): WishlistItem[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is WishlistItem =>
      item && typeof item.productId === 'string' && typeof item.quantity === 'number'
  );
};

const readStoredWishlist = (): WishlistItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return sanitizeStoredWishlist(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to parse stored wishlist', error);
    return [];
  }
};

const writeStoredWishlist = (items: WishlistLine[]) => {
  try {
    const serialized = JSON.stringify(
      items.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity }))
    );
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to persist wishlist', error);
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const [items, setItemsState] = useState<WishlistLine[]>(() => readStoredWishlist());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (user) {
      setItemsState(user.role === 'client' ? (user.wishlist ?? []) : []);
    }
  }, [user, initializing]);

  useEffect(() => {
    writeStoredWishlist(items);
  }, [items]);

  const syncIfNeeded = useCallback(
    async (nextItems: WishlistItem[]) => {
      if (!user || user.role !== 'client') {
        return;
      }
      setSyncing(true);
      try {
        await wishlistApi.update(nextItems);
      } finally {
        setSyncing(false);
      }
    },
    [user]
  );

  const addItem = useCallback<WishlistContextValue['addItem']>(
    async (item, product) => {
      let nextItems: WishlistLine[] = [];
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

      await syncIfNeeded(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const updateItem = useCallback<WishlistContextValue['updateItem']>(
    async (productId, quantity) => {
      let nextItems: WishlistLine[] = [];
      const normalized = Math.max(1, Math.round(quantity));
      setItemsState((current) => {
        nextItems = current.map((line) =>
          line.productId === productId ? { ...line, quantity: normalized } : line
        );
        return nextItems;
      });

      await syncIfNeeded(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const removeItem = useCallback<WishlistContextValue['removeItem']>(
    async (productId) => {
      let nextItems: WishlistLine[] = [];
      setItemsState((current) => {
        nextItems = current.filter((line) => line.productId !== productId);
        return nextItems;
      });

      await syncIfNeeded(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncIfNeeded]
  );

  const clearWishlist = useCallback(async () => {
    setItemsState([]);
    await syncIfNeeded([]);
  }, [syncIfNeeded]);

  const setItems = useCallback<WishlistContextValue['setItems']>(
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
      const { wishlist } = await wishlistApi.get();
      setItemsState(wishlist);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      syncing,
      addItem,
      updateItem,
      removeItem,
      clearWishlist,
      setItems,
      loadFromServer,
    }),
    [items, syncing, addItem, updateItem, removeItem, clearWishlist, setItems, loadFromServer]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
