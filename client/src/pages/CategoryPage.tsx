import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import type { Category, Product } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { ProductCard } from '../components/product/ProductCard';

export const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      return;
    }

    const loadCategory = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ category: fetchedCategory }, { categories: all } ] = await Promise.all([
          categoriesApi.get(categoryId),
          categoriesApi.list(),
        ]);

        setCategory(fetchedCategory);
        setAllCategories(all);
        setChildCategories(all.filter((cat) => cat.parentId === fetchedCategory.id));

        const { products: fetchedProducts } = await productsApi.list({ categoryId: fetchedCategory.id });
        setProducts(fetchedProducts);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load category');
      } finally {
        setLoading(false);
      }
    };

    void loadCategory();
  }, [categoryId]);

  const heroContent = useMemo(() => {
    if (category?.heroImageUrl) {
      return (
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
          <img
            src={category.heroImageUrl}
            alt={category.name}
            className="h-64 w-full object-cover md:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8 text-white md:p-12">
            <span className="text-xs uppercase tracking-[0.3em] text-white/80">Category</span>
            <h1 className="text-3xl font-semibold md:text-4xl">{category.name}</h1>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
        <span className="text-xs uppercase tracking-[0.3em] text-white/80">Category</span>
        <h1 className="text-3xl font-semibold md:text-4xl">{category?.name ?? 'Loading'}</h1>
      </div>
    );
  }, [category]);

  const breadcrumbChain = useMemo(() => {
    if (!category) {
      return [] as Category[];
    }
    if (!allCategories.length) {
      return [category];
    }

    const map = new Map(allCategories.map((cat) => [cat.id, cat]));
    const chain: Category[] = [];
    let current: Category | undefined | null = category;

    while (current) {
      chain.push(current);
      if (!current.parentId) {
        break;
      }
      current = map.get(current.parentId) ?? null;
    }

    return chain.reverse();
  }, [category, allCategories]);

  return (
    <SiteLayout>
      <section className="mx-auto mb-12 w-[88%] space-y-6 py-8">
        <div className="text-xs text-muted">
          <Link to="/" className="transition hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/categories" className="font-medium text-slate-700 transition hover:text-primary">
            Categories
          </Link>
          {breadcrumbChain.length > 0 &&
            breadcrumbChain.map((crumb, index) => (
              <span key={crumb.id}>
                <span className="mx-2">/</span>
                {index === breadcrumbChain.length - 1 ? (
                  <span className="font-semibold text-slate-900">{crumb.name}</span>
                ) : (
                  <Link
                    className="transition hover:text-primary"
                    to={crumb.slug ? `/categories/${crumb.slug}` : `/categories/${crumb.id}`}
                  >
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        ) : (
          heroContent
        )}
      </section>

      {!loading && !error && childCategories.length > 0 && (
        <section className="mx-auto mb-12 w-[88%] space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Subcategories</h2>
            <p className="text-sm text-muted">Quickly dive into a more specific category.</p>
          </div>
          <CategoryGrid categories={childCategories} />
        </section>
      )}

      <section className="mx-auto mb-12 w-[88%] space-y-6 pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {category?.name ?? 'Category'} Products
            </h2>
            <p className="text-sm text-muted">
              Showing {products.length} {products.length === 1 ? 'item' : 'items'}
            </p>
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        ) : products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            No products found for this category yet. Check back soon!
          </div>
        )}
      </section>
    </SiteLayout>
  );
};
