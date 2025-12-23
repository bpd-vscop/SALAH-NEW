import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { ProductCard } from '../product/ProductCard';

const DESKTOP_LIMIT = 10;
const MOBILE_LIMIT = 6;

export const NewProductsSection: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadNewProducts = async () => {
      try {
        const response = await productsApi.list({ limit: DESKTOP_LIMIT, sort: 'newest' });

        const isAvailable = (product: Product) => {
          const allowBackorder = product.inventory?.allowBackorder ?? false;
          const availableQuantity = product.inventory?.quantity ?? null;
          const inventoryStatus = product.inventory?.status ?? 'in_stock';
          const outOfStock =
            inventoryStatus === 'out_of_stock' ||
            (!allowBackorder && typeof availableQuantity === 'number' && availableQuantity <= 0);
          return !outOfStock;
        };

        const list = (response.products ?? []).filter(isAvailable).slice(0, DESKTOP_LIMIT);
        if (isMounted) {
          setProducts(list);
        }
      } catch (error) {
        console.error('Failed to load new products', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadNewProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mb-8 w-[88%] mx-auto py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">New Products</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: DESKTOP_LIMIT }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  return (
      <section className="mb-8 w-[88%] mx-auto py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">New Products</h2>
        <Link
          to="/products"
          className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all products
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.slice(0, DESKTOP_LIMIT).map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            hideTags
            className={index >= MOBILE_LIMIT ? 'hidden sm:flex' : undefined}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          to="/products"
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all products
        </Link>
      </div>
    </section>
  );
};
