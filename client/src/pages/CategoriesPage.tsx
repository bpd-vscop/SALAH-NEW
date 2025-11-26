import { useEffect, useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    const query = searchQuery.toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Category directory</h2>
              <p className="text-sm text-muted">Select a category to explore its curated inventory and promotions.</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-sm text-muted">
              Found {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
            </p>
          )}
        </div>

        {error && !hasContent ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        ) : filteredCategories.length === 0 && searchQuery ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <Search className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No categories found</h3>
            <p className="mt-1 text-sm text-slate-600">
              No categories match your search for "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Clear search
            </button>
          </div>
        ) : (
          <CategoryGrid
            categories={filteredCategories}
            loading={loading && !filteredCategories.length}
          />
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
