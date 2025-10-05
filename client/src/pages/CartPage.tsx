import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';

export const CartPage: React.FC = () => {
  const { items, updateItem, removeItem } = useCart();
  const { user } = useAuth();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
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

  const total = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap[line.productId];
      const price = product?.price ?? 0;
      return sum + price * line.quantity;
    }, 0);
  }, [items, productMap]);

  return (
    <SiteLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">Your Cart</h1>
          <p className="text-sm text-muted">
            Manage items before confirming pickup or delivery.
          </p>
        </div>

        {!items.length && (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Your cart is empty. Start exploring our{' '}
            <Link to="/products" className="font-medium text-primary hover:text-primary-dark">
              catalog
            </Link>
            .
          </p>
        )}

        {loadingProducts && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Loading product details...
          </div>
        )}

        {items.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {items.map((line) => {
                const product = productMap[line.productId];
                return (
                  <article
                    key={line.productId}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary hover:shadow-md sm:flex-row"
                  >
                    <img
                      src={product?.images?.[0] ?? 'https://placehold.co/160x160?text=Item'}
                      alt={product?.name ?? 'Cart item'}
                      className="h-32 w-32 rounded-xl object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{product?.name ?? 'Loading item...'}</h3>
                        <p className="text-sm text-muted">
                          {product?.description?.slice(0, 120) ?? 'Fetching product description...'}
                        </p>
                      </div>
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency((product?.price ?? 0) * line.quantity)}
                        </p>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-muted">
                            Qty
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(event) => {
                                const nextQuantity = Number(event.target.value);
                                if (!Number.isNaN(nextQuantity) && nextQuantity > 0) {
                                  updateItem(line.productId, nextQuantity);
                                }
                              }}
                              className="h-10 w-16 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                            onClick={() => removeItem(line.productId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <aside className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-semibold text-slate-900">{formatCurrency(total)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Taxes &amp; shipping</dt>
                  <dd className="text-right text-xs text-muted">
                    Calculated at pickup / checkout
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
                onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
              >
                Proceed to checkout
              </button>
              {!user && (
                <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs text-muted">
                  You need an account before placing orders.
                </p>
              )}
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
};
