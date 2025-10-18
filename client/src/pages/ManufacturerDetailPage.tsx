import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import { SiteLayout } from '../components/layout/SiteLayout';
import { formatCurrency } from '../utils/format';
import { productsApi } from '../api/products';
import type { Product } from '../types/api';

export const ManufacturerDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { manufacturers } = await manufacturersApi.list();
        setItems(manufacturers);
        // No backend relation yet; show top products as a placeholder similar to category page
        const { products: anyProducts } = await productsApi.list({ tags: ['on sale'] });
        setProducts(anyProducts.slice(0, 6));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load manufacturer');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const m = useMemo(() => items.find((x) => x.slug === slug), [items, slug]);

  return (
    <SiteLayout>
      <section className="mx-auto mb-12 w-[88%] space-y-6 py-8">
        <div className="text-xs text-muted">
          <Link to="/" className="transition hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/manufacturers" className="font-medium text-slate-700 transition hover:text-primary">Manufacturers</Link>
          {m && (
            <>
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900">{m.name}</span>
            </>
          )}
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">{error}</div>
        ) : m ? (
          m.heroImage ? (
            <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
              <img src={m.heroImage || m.logoImage} alt={m.name} className="h-64 w-full object-cover md:h-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8 text-white md:p-12">
                <span className="text-xs uppercase tracking-[0.3em] text-white/80">Manufacturer</span>
                <h1 className="text-3xl font-semibold md:text-4xl">{m.name}</h1>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
              <span className="text-xs uppercase tracking-[0.3em] text-white/80">Manufacturer</span>
              <h1 className="text-3xl font-semibold md:text-4xl">{m.name}</h1>
            </div>
          )
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted">Manufacturer not found.</div>
        )}
      </section>

      <section className="mx-auto mb-12 w-[88%] space-y-6 pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{m?.name ?? 'Manufacturer'} Products</h2>
            <p className="text-sm text-muted">Showing {products.length} {products.length === 1 ? 'item' : 'items'}</p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            Browse full catalog
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        ) : products.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img src={p.images[0] ?? 'https://placehold.co/400x300?text=Product'} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(p.price ?? 0)}</p>
                  </div>
                  <Link to={`/products/${p.id}`} className="mt-auto inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary">View details</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">No products available for this manufacturer yet. Check back soon!</div>
        )}
      </section>
    </SiteLayout>
  );
};
