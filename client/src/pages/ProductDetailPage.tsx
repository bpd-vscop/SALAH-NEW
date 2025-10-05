import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: data } = await productsApi.get(id);
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load product');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  return (
    <SiteLayout>
      {loading && (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
          Loading product details...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
      )}
      {product && (
        <article className="grid gap-10 rounded-2xl border border-border bg-surface p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={product.images[0] ?? 'https://placehold.co/800x540?text=Product'}
                alt={product.name}
                className="w-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((image) => (
                  <img
                    key={image}
                    src={image}
                    alt={product.name}
                    className="h-20 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(product.price ?? 0)}
              </div>
            </div>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-700">
              {product.description || 'No description provided.'}
            </p>
            {product.attributes && (
              <dl className="grid gap-3 rounded-xl border border-border bg-background p-4 text-sm text-slate-700">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <dt className="text-xs uppercase tracking-wide text-muted">{key}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <button
              type="button"
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
              onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
            >
              Add to cart
            </button>
            <p className="text-xs text-muted">All sales are final. No returns or exchanges.</p>
          </div>
        </article>
      )}
    </SiteLayout>
  );
};
