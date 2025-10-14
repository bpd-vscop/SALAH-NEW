import { useEffect, useState } from 'react';
import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import type { Banner, Category, Product } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { formatCurrency } from '../utils/format';
import { useCart } from '../context/CartContext';
import { HeroSlider } from '../components/home/HeroSlider';
import { FeaturedProducts } from '../components/home/FeaturedProducts';

export const HomePage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bannerRes, categoryRes, productRes] = await Promise.all([
          bannersApi.list(),
          categoriesApi.list(),
          productsApi.list({ tags: ['on sale'] }),
        ]);
        setBanners(bannerRes.banners);
        setCategories(categoryRes.categories.slice(0, 6));
        setFeatured(productRes.products.slice(0, 8));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load homepage');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const slideBanner = banners.filter((banner) => banner.type === 'slide');
  const rowBanners = banners.filter((banner) => banner.type === 'row');

  return (
    <SiteLayout>
      <HeroSlider />
      <FeaturedProducts />

      <section className="mb-12 space-y-6 w-[88%] mx-auto py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Popular Categories</h2>
            <p className="text-sm text-muted">Browse our most in-demand product groups.</p>
          </div>
        </div>
        {categories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                <p className="mt-2 text-sm text-muted">
                  {category.parentId ? 'Subcategory' : 'Top category'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            No categories yet.
          </p>
        )}
      </section>

      <section className="mb-12 space-y-6 w-[88%] mx-auto py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured Offers</h2>
            <p className="text-sm text-muted">Take advantage of current promotions and bundle pricing.</p>
          </div>
        </div>
        {loading && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Loading featured products...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <article
              key={product.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={product.images[0] ?? 'https://placehold.co/400x300?text=Product'}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {product.tags.length > 0 && (
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(product.price ?? 0)}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
                  onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!!rowBanners.length && (
        <section className="mb-12 w-[88%] mx-auto py-8">
          <div className="grid gap-4 md:grid-cols-2">
            {rowBanners.map((banner) => (
              <img
                key={banner.id}
                src={banner.imageUrl}
                alt={banner.text ?? 'Row banner'}
                className="h-full w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {!!slideBanner.length && (
        <section className="mb-12 space-y-6 w-[88%] mx-auto py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Announcements</h2>
              <p className="text-sm text-muted">Updates, events, and notices from the SALAH team.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {slideBanner.map((banner) => (
              <article
                key={banner.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.text ?? 'Announcement'}
                  className="h-40 w-full object-cover"
                />
                {banner.text && (
                  <p className="px-5 py-4 text-sm text-slate-700">{banner.text}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
};
