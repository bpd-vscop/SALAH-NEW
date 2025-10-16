import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { categoryDisplayApi } from '../api/categoryDisplay';
import type { Category } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { CategoryGrid } from '../components/home/CategoryGrid';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroImage, setHeroImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ categories: data }, { settings }] = await Promise.all([
          categoriesApi.list(),
          categoryDisplayApi.get(),
        ]);
        setCategories(data);
        setHeroImage(settings.allCategoriesHeroImage ?? '');
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load categories');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const hasContent = categories.length > 0;
  const topLevelCategories = categories.filter((category) => !category.parentId);
  const primaryGridCategories = topLevelCategories.length ? topLevelCategories : categories;
  const groupedChildren = topLevelCategories.map((top) => ({
    parent: top,
    children: categories.filter((category) => category.parentId === top.id),
  }));

  return (
    <SiteLayout>
      <section className="mx-auto w-[88%] space-y-6 py-8">
        {heroImage ? (
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
            <img src={heroImage} alt="All categories hero" className="h-64 w-full object-cover md:h-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8 text-white md:p-12">
              <span className="text-xs uppercase tracking-[0.3em] text-white/80">Browse</span>
              <h1 className="text-3xl font-semibold md:text-4xl">All categories</h1>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
            <span className="text-xs uppercase tracking-[0.3em] text-white/70">Browse</span>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">All categories</h1>
          </div>
        )}
      </section>

      <section className="mx-auto w-[88%] pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Category directory</h2>
            <p className="text-sm text-muted">Select a category to explore its curated inventory and promotions.</p>
          </div>
        </div>

        {error && !hasContent ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <CategoryGrid
              categories={primaryGridCategories}
              loading={loading && !primaryGridCategories.length}
            />

            {groupedChildren.length > 0 && (
              <div className="mt-12 space-y-8">
                {groupedChildren.map(({ parent, children }) => (
                  <div key={parent.id} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link
                          to={parent.slug ? `/categories/${parent.slug}` : `/categories/${parent.id}`}
                          className="text-lg font-semibold text-slate-900 transition hover:text-primary"
                        >
                          {parent.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {children.length} {children.length === 1 ? 'subcategory' : 'subcategories'}
                        </p>
                      </div>
                      <Link
                        to={parent.slug ? `/categories/${parent.slug}` : `/categories/${parent.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      >
                        View category
                      </Link>
                    </div>
                    {children.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {children.map((child) => (
                          <Link
                            key={child.id}
                            to={child.slug ? `/categories/${child.slug}` : `/categories/${child.id}`}
                            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-muted">No subcategories configured yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && hasContent && (
          <p className="mt-4 text-xs text-red-600">
            Some categories may not be shown: {error}
          </p>
        )}
      </section>
    </SiteLayout>
  );
};
