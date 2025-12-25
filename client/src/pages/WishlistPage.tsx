import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Heart, CheckSquare, Square } from 'lucide-react';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

const isSaleActive = (product: Product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }

  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

export const WishlistPage: React.FC = () => {
  const { items, updateItem, removeItem, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const missing = items
      .filter((line) => !productMap[line.productId])
      .map((line) => line.productId);
    if (!missing.length) {
      return;
    }

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
        const nextMap: Record<string, Product> = {};
        responses.forEach((result) => {
          if (result.status === 'fulfilled') {
            const product = result.value.product;
            nextMap[product.id] = product;
          }
        });
        setProductMap((current) => ({ ...current, ...nextMap }));
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [items, productMap]);

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set());
    }
  }, [selectMode]);

  const toggleSelected = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleProceed = async () => {
    const idsToUse = selectMode ? Array.from(selectedIds) : items.map((item) => item.productId);
    if (!idsToUse.length) {
      return;
    }

    for (const productId of idsToUse) {
      const line = items.find((item) => item.productId === productId);
      if (!line) continue;
      const product = productMap[productId];
      await addItem({ productId, quantity: line.quantity }, product);
    }

    navigate('/checkout');
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap[line.productId];
      if (!product) return sum;
      const saleActive = isSaleActive(product);
      const price = saleActive ? (product.salePrice as number) : product.price;
      return sum + price * line.quantity;
    }, 0);
  }, [items, productMap]);

  return (
    <SiteLayout>
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Wishlist</h1>
              <p className="text-sm text-slate-600">Save items to revisit later.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectMode((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition',
                  selectMode
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                {selectMode ? 'Selecting' : 'Select'}
              </button>
              <button
                type="button"
                onClick={() => void clearWishlist()}
                disabled={!items.length}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear wishlist
              </button>
              <button
                type="button"
                onClick={() => void handleProceed()}
                disabled={!items.length || (selectMode && selectedIds.size === 0)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proceed to checkout
              </button>
            </div>
          </div>

          {loadingProducts && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
              Loading wishlist items...
            </div>
          )}

          {!items.length && !loadingProducts && (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                <Heart className="h-8 w-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Your wishlist is empty</h2>
              <p className="mt-2 text-sm text-slate-600">Browse products and tap the heart to save them.</p>
              <Link
                to="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Browse products
              </Link>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-6 space-y-4">
              {items.map((line) => {
                const product = productMap[line.productId];
                const saleActive = product ? isSaleActive(product) : false;
                const price = product
                  ? saleActive
                    ? (product.salePrice as number)
                    : product.price
                  : 0;
                const isSelected = selectedIds.has(line.productId);

                return (
                  <div
                    key={line.productId}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
                  >
                    {selectMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelected(line.productId)}
                        className="self-start text-slate-500 transition hover:text-rose-600"
                        aria-label="Select wishlist item"
                      >
                        {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </button>
                    )}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <img
                          src={product?.images?.[0] ?? 'https://placehold.co/100x100?text=Product'}
                          alt={product?.name ?? 'Product'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {product?.name ?? 'Product'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatCurrency(price)} {saleActive ? '(sale)' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateItem(line.productId, line.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-primary"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-slate-800">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(line.productId, line.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-primary"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-8 flex flex-col items-end gap-2">
              <p className="text-sm text-slate-600">Wishlist total</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(subtotal)}</p>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
};
