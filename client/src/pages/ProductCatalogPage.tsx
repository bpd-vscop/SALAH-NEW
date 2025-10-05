import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useCart } from '../context/CartContext';
import type { Category, Product, ProductTag } from '../types/api';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

const tagOptions: ProductTag[] = ['in stock', 'out of stock', 'on sale', 'available to order'];

export const ProductCatalogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<ProductTag>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { categories: data } = await categoriesApi.list();
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };
    void loadCategories();
  }, []);

  const loadProducts = useMemo(
    () =>
      async (params?: { categoryId?: string; tags?: ProductTag[]; search?: string }) => {
        setLoading(true);
        setError(null);
        try {
          const { products: data } = await productsApi.list(params);
          setProducts(data);
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Unable to load products');
        } finally {
          setLoading(false);
        }
      },
    []
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadProducts({
      categoryId: selectedCategory || undefined,
      tags: selectedTags.size ? Array.from(selectedTags) : undefined,
      search: search || undefined,
    });
  };

  const toggleTag = (tag: ProductTag) => {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <SiteLayout>
      <section className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Product Catalog</h1>
          <p className="text-sm text-muted">Search, filter, and discover parts stocked across the network.</p>
        </div>
        <form
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_140px] md:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Search inventory
              <input
                type="search"
                placeholder="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Category
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              Apply filters
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-border bg-white text-slate-600 hover:border-primary hover:text-primary'
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </form>

        {loading && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Loading products...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
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
                <div className="mt-auto flex flex-wrap gap-2">
                  <a
                    className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    href={`/products/${product.id}`}
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
                    onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!loading && !products.length && (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No products available.
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};
