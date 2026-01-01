import { useCallback, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '../api/wishlist';
import type { WishlistItem } from '../types/api';
import { useAuth } from './useAuth';
import { WishlistContext, type WishlistContextValue, type WishlistLine } from './wishlist-context';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const [items, setItemsState] = useState<WishlistLine[]>([]);
  const [syncing, setSyncing] = useState(false);
  const isClientUser = user?.role === 'client';

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (!isClientUser) {
      setItemsState([]);
      setSyncing(false);
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
  }, [initializing, isClientUser, user?.id]);

  const syncWishlist = useCallback(async (nextItems: WishlistItem[]) => {
    if (!isClientUser) {
      return;
    }
    setSyncing(true);
    try {
      const { wishlist } = await wishlistApi.update(nextItems);
      setItemsState(wishlist);
    } finally {
      setSyncing(false);
    }
  }, [isClientUser]);

  const addItem = useCallback<WishlistContextValue['addItem']>(
    async (item, product) => {
      if (!isClientUser) {
        return;
      }
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
    [isClientUser, syncWishlist]
  );

  const updateItem = useCallback<WishlistContextValue['updateItem']>(
    async (productId, quantity) => {
      if (!isClientUser) {
        return;
      }
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
    [isClientUser, syncWishlist]
  );

  const removeItem = useCallback<WishlistContextValue['removeItem']>(
    async (productId) => {
      if (!isClientUser) {
        return;
      }
      let nextItems: WishlistLine[] = [];
      setItemsState((current) => {
        nextItems = current.filter((line) => line.productId !== productId);
        return nextItems;
      });

      await syncWishlist(nextItems.map<WishlistItem>(({ productId, quantity }) => ({ productId, quantity })));
    },
    [isClientUser, syncWishlist]
  );

  const clearWishlist = useCallback(async () => {
    if (!isClientUser) {
      return;
    }
    setItemsState([]);
    await syncWishlist([]);
  }, [isClientUser, syncWishlist]);

  const setItems = useCallback<WishlistContextValue['setItems']>(
    async (nextItems) => {
      if (!isClientUser) {
        return;
      }
      setItemsState(nextItems);
      await syncWishlist(nextItems);
    },
    [isClientUser, syncWishlist]
  );

  const loadFromServer = useCallback(async () => {
    if (!isClientUser) {
      return;
    }
    setSyncing(true);
    try {
      const { wishlist } = await wishlistApi.get();
      setItemsState(wishlist);
    } finally {
      setSyncing(false);
    }
  }, [isClientUser]);

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
