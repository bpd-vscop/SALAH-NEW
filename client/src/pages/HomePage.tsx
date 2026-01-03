import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// banners removed
import { categoriesApi } from '../api/categories';
import { categoryDisplayApi } from '../api/categoryDisplay';
import type { Category } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { HeroSlider } from '../components/home/HeroSlider';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { NewProductsSection } from '../components/home/NewProductsSection';
import { BackInStockOffers } from '../components/home/BackInStockOffers';
import { OnSaleOffers } from '../components/home/OnSaleOffers';
import { ComingSoonOffers } from '../components/home/ComingSoonOffers';
import { ManufacturerLogos } from '../components/home/ManufacturerLogos';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { BatteryPromo } from '../components/home/BatteryPromo';

const HOMEPAGE_CATEGORY_LIMIT = 18;

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [categoryRes, displayRes] = await Promise.all([
          categoriesApi.list(),
          categoryDisplayApi.get(),
        ]);

        const categoriesById = new Map(categoryRes.categories.map((category) => [category.id, category]));
        const selectedFromSettings = displayRes.settings.homepageCategories
          .map((id) => categoriesById.get(id))
          .filter((category): category is Category => Boolean(category))
          .slice(0, HOMEPAGE_CATEGORY_LIMIT);

        const topLevel = categoryRes.categories.filter((category) => !category.parentId);
        const fallbackSource = topLevel.length ? topLevel : categoryRes.categories;
        const fallbackCategories = fallbackSource.slice(0, HOMEPAGE_CATEGORY_LIMIT);
        const effectiveCategories = selectedFromSettings.length
          ? selectedFromSettings.slice(0, HOMEPAGE_CATEGORY_LIMIT)
          : fallbackCategories;

        setCategories(effectiveCategories);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load homepage');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // banners removed

  const categoriesLoading = loading && categories.length === 0;

  return (
    <SiteLayout>
      <HeroSlider />
      <FeaturedProducts />

      <section className="mb-8 w-[88%] mx-auto py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Popular Categories</h2>
          <Link
            to="/categories"
            className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            See all categories
          </Link>
        </div>
        {error && !categories.length && !categoriesLoading ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <CategoryGrid categories={categories} loading={categoriesLoading} />
        )}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            to="/categories"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            See all categories
          </Link>
        </div>
      </section>

      <NewProductsSection />
      <OnSaleOffers />
      <BackInStockOffers />
      <ComingSoonOffers />

      {/* Manufacturers logos */}
      <ManufacturerLogos />

      {/* Battery Promo Section - appears last before footer */}
      <BatteryPromo />

      {/* Banners removed */}
    </SiteLayout>
  );
};
