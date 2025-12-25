import { useCallback, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '../api/wishlist';
import type { WishlistItem } from '../types/api';
import { useAuth } from './useAuth';
import { WishlistContext, type WishlistContextValue, type WishlistLine } from './wishlist-context';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const [items, setItemsState] = useState<WishlistLine[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initializing) {
      return;
    }

    let active = true;
    const load = async () => {
      setSyncing(true);
      try {
        const { wishlist } = await wishlistApi.get();
        if (active) {
          setItemsState(wishlist);
        }
      } catch (error) {
        console.warn('Failed to load wishlist', error);
      } finally {
        if (active) {
          setSyncing(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [initializing, user?.id]);

  const syncWishlist = useCallback(async (nextItems: WishlistItem[]) => {
    setSyncing(true);
    try {
      const { wishlist } = await wishlistApi.update(nextItems);
      setItemsState(wishlist);
    } finally {
      setSyncing(false);
    }
  }, []);

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

      await syncWishlist(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncWishlist]
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

      await syncWishlist(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncWishlist]
  );

  const removeItem = useCallback<WishlistContextValue['removeItem']>(
    async (productId) => {
      let nextItems: WishlistLine[] = [];
      setItemsState((current) => {
        nextItems = current.filter((line) => line.productId !== productId);
        return nextItems;
      });

      await syncWishlist(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [syncWishlist]
  );

  const clearWishlist = useCallback(async () => {
    setItemsState([]);
    await syncWishlist([]);
  }, [syncWishlist]);

  const setItems = useCallback<WishlistContextValue['setItems']>(
    async (nextItems) => {
      setItemsState(nextItems);
      await syncWishlist(nextItems);
    },
    [syncWishlist]
  );

  const loadFromServer = useCallback(async () => {
    setSyncing(true);
    try {
      const { wishlist } = await wishlistApi.get();
      setItemsState(wishlist);
    } finally {
      setSyncing(false);
    }
  }, []);

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
