import { useEffect, useState } from 'react';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { ProductCard } from '../product/ProductCard';

export const FeaturedOffers: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedProducts = async () => {
      try {
        // Fetch products with "on sale" tag
        const { products: data } = await productsApi.list({ tags: ['on sale'] });
        if (isMounted) {
          // Take first 4 products
          setProducts(data.slice(0, 4));
        }
      } catch (error) {
        console.error('Failed to load featured offers', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFeaturedProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto mb-12 w-[88%]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Featured Offers</h2>
            <p className="text-sm text-muted">
              Take advantage of current promotions and bundle pricing.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  return (
    <section className="mx-auto mb-12 w-[88%]">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Featured Offers</h2>
          <p className="text-sm text-muted">
            Take advantage of current promotions and bundle pricing.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};