import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, X, Filter } from 'lucide-react';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import type { Category, Product, ProductStatusTag } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { ProductCard } from '../components/product/ProductCard';
import { cn } from '../utils/cn';
import { getProductStatusTags, isComingSoon } from '../utils/productStatus';

const tagOptions: ProductStatusTag[] = [
  'in stock',
  'out of stock',
  'on sale',
  'back in stock',
  'new arrival',
  'coming soon',
];

export const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [carBrands, setCarBrands] = useState<string[]>([]); // Unique car brands from product compatibility
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<ProductStatusTag>>(new Set());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!categoryId) {
      return;
    }

    const loadCategory = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ category: fetchedCategory }, { categories: all }, { manufacturers: manufacturerList }] = await Promise.all([
          categoriesApi.get(categoryId),
          categoriesApi.list(),
          manufacturersApi.list(),
        ]);

        setCategory(fetchedCategory);
        setAllCategories(all);
        setChildCategories(all.filter((cat) => cat.parentId === fetchedCategory.id));
        setManufacturers(manufacturerList.filter(m => m.isActive));

        const { products: fetchedProducts } = await productsApi.list({ categoryId: fetchedCategory.id });
        setProducts(fetchedProducts);

        // Extract unique car brands from product compatibility
        const brandsSet = new Set<string>();
        fetchedProducts.forEach((product) => {
          if (product.compatibility && Array.isArray(product.compatibility)) {
            product.compatibility.forEach((compat) => {
              if (compat.make) {
                brandsSet.add(compat.make);
              }
            });
          }
        });
        setCarBrands(Array.from(brandsSet).sort());

        // Auto-adjust price range based on products
        if (fetchedProducts.length > 0) {
          const prices = fetchedProducts.map((p) => p.price);
          const maxProductPrice = Math.ceil(Math.max(...prices));
          setMinPrice(0);
          setMaxPrice(maxProductPrice);
        } else {
          setMinPrice(0);
          setMaxPrice(10000);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load category');
      } finally {
        setLoading(false);
      }
    };

    void loadCategory();
  }, [categoryId]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (isComingSoon(product)) {
        return selectedTags.has('coming soon');
      }
      // Search filter
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Price range filter
      if (product.price < minPrice || product.price > maxPrice) {
        return false;
      }

      // Manufacturer filter
      if (selectedManufacturers.size > 0) {
        if (!product.manufacturerId || !selectedManufacturers.has(product.manufacturerId)) {
          return false;
        }
      }

      // Brand filter (car brands from compatibility)
      if (selectedBrands.size > 0) {
        if (!product.compatibility || !Array.isArray(product.compatibility)) {
          return false;
        }
        const hasSelectedBrand = product.compatibility.some((compat) =>
          compat.make && selectedBrands.has(compat.make)
        );
        if (!hasSelectedBrand) {
          return false;
        }
      }

      // Tags filter
      if (selectedTags.size > 0) {
        const productTags = getProductStatusTags(product);
        const hasSelectedTag = Array.from(selectedTags).some((tag) => productTags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      return true;
    });
  }, [products, debouncedSearch, minPrice, maxPrice, selectedManufacturers, selectedBrands, selectedTags]);

  const toggleManufacturer = (manufacturerId: string) => {
    setSelectedManufacturers((current) => {
      const next = new Set(current);
      if (next.has(manufacturerId)) {
        next.delete(manufacturerId);
      } else {
        next.add(manufacturerId);
      }
      return next;
    });
  };

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((current) => {
      const next = new Set(current);
      if (next.has(brandName)) {
        next.delete(brandName);
      } else {
        next.add(brandName);
      }
      return next;
    });
  };

  const toggleTag = (tag: ProductStatusTag) => {
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

  const clearFilters = () => {
    setSearch('');
    setSelectedManufacturers(new Set());
    setSelectedBrands(new Set());
    setSelectedTags(new Set());
    if (products.length > 0) {
      const prices = products.map((p) => p.price);
      setMinPrice(0);
      setMaxPrice(Math.ceil(Math.max(...prices)));
    } else {
      setMinPrice(0);
      setMaxPrice(10000);
    }
  };

  const maxProductPrice = products.length > 0 ? Math.max(...products.map(p => p.price)) : 10000;
  const hasActiveFilters = debouncedSearch || selectedManufacturers.size > 0 || selectedBrands.size > 0 || selectedTags.size > 0 ||
    minPrice > 0 || maxPrice < maxProductPrice;

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
            {category.description && (
              <p className="max-w-2xl text-sm text-white/90">{category.description}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
        <span className="text-xs uppercase tracking-[0.3em] text-white/80">Category</span>
        <h1 className="text-3xl font-semibold md:text-4xl">{category?.name ?? 'Loading'}</h1>
        {category?.description && (
          <p className="mt-2 max-w-2xl text-sm text-white/90">{category.description}</p>
        )}
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

  const FiltersSidebar = useMemo(() => (
    <aside className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Filter by price</h3>
        <div className="space-y-4">
          {/* Dual Range Slider */}
          <div className="relative pt-1 pb-2">
            <div className="relative h-1 bg-slate-200 rounded">
              {/* Selected range background */}
              <div
                className="absolute h-full bg-red-600 rounded"
                style={{
                  left: `${(minPrice / maxProductPrice) * 100}%`,
                  right: `${100 - (maxPrice / maxProductPrice) * 100}%`
                }}
              />
            </div>
            {/* Min handle */}
            <input
              type="range"
              min="0"
              max={maxProductPrice}
              value={minPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val <= maxPrice) setMinPrice(val);
              }}
              className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-800 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              style={{ zIndex: minPrice > maxPrice - 100 ? 5 : 3 }}
            />
            {/* Max handle */}
            <input
              type="range"
              min="0"
              max={maxProductPrice}
              value={maxPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= minPrice) setMaxPrice(val);
              }}
              className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-800 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              style={{ zIndex: 4 }}
            />
          </div>
          {/* Price labels */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">${minPrice.toFixed(2)}</span>
            <span className="font-medium">${maxPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filter by Brand (Car Brands) */}
      {carBrands.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Filter by Brand</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {carBrands.map((brand) => {
              const isSelected = selectedBrands.has(brand);
              return (
                <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBrand(brand)}
                    className="h-3.5 w-3.5 border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{brand}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Manufacturers Filter */}
      {manufacturers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Manufacturer</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {manufacturers.map((manufacturer) => {
              const isSelected = selectedManufacturers.has(manufacturer.id);
              return (
                <label key={manufacturer.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleManufacturer(manufacturer.id)}
                    className="h-3.5 w-3.5 border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{manufacturer.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability Filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Availability</h3>
        <div className="grid grid-cols-2 gap-2">
          {tagOptions.map((tag) => {
            const active = selectedTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all border bg-white shadow-sm',
                  active
                    ? 'border-red-600 text-red-600 ring-2 ring-red-600 ring-opacity-50'
                    : 'border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50'
                )}
              >
                <span className="capitalize">{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Clear All Filters
        </button>
      )}
    </aside>
  ), [search, minPrice, maxPrice, selectedManufacturers, selectedBrands, selectedTags, manufacturers, carBrands, maxProductPrice, hasActiveFilters, setSearch, toggleManufacturer, toggleBrand, toggleTag, clearFilters]);

  return (
    <SiteLayout>
      <section className="mx-auto mb-8 w-[88%] space-y-6 py-8">
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
        <section className="mx-auto mb-8 w-[88%] space-y-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Subcategories</h2>
            <p className="text-sm text-muted">Quickly dive into a more specific category.</p>
          </div>
          <CategoryGrid categories={childCategories} />
        </section>
      )}

      <section className="mx-auto mb-12 w-[88%] pb-16">
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mb-4 flex items-center justify-center gap-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters ? 'Filters Active' : 'Show Filters'}
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Filters */}
          <div className="hidden lg:block lg:w-72 flex-shrink-0">
            {FiltersSidebar}
          </div>

          {/* Mobile Filters Overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-50 p-6 overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {FiltersSidebar}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {category?.name ?? 'Category'} Products
                </h2>
                <p className="text-sm text-muted">
                  Showing {filteredProducts.length} of {products.length} {products.length === 1 ? 'item' : 'items'}
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
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                {error}
              </div>
            ) : filteredProducts.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Search className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Try adjusting your filters to see more results
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};
