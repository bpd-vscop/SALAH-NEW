import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Filter, Package, Search, X } from 'lucide-react';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import { SiteLayout } from '../components/layout/SiteLayout';
import type { Category, Product, ProductTag } from '../types/api';
import { cn } from '../utils/cn';
import { ProductCard } from '../components/product/ProductCard';
import { Select } from '../components/ui/Select';

const tagOptions: ProductTag[] = ['in stock', 'out of stock', 'on sale', 'available to order'];

export const ProductCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || '';

  // State
  const [search, setSearch] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<ProductTag>>(new Set());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'newest'>('recommended');

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(true);

  // Vehicle search parameters from URL
  const vehicleYear = searchParams.get('vehicleYear') || '';
  const vehicleMake = searchParams.get('vehicleMake') || '';
  const vehicleModel = searchParams.get('vehicleModel') || '';
  const urlOnSale = ['true', '1', 'yes'].includes((searchParams.get('onSale') || '').toLowerCase());
  const urlBackInStock = ['true', '1', 'yes'].includes((searchParams.get('backInStock') || '').toLowerCase());
  const urlFeatured = ['true', '1', 'yes'].includes((searchParams.get('featured') || '').toLowerCase());
  const urlNewArrival = ['true', '1', 'yes'].includes((searchParams.get('newArrival') || '').toLowerCase());

  // Sync search value from URL (used by header search)
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // Load categories
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

  // Load manufacturers
  useEffect(() => {
    const loadManufacturers = async () => {
      try {
        const { manufacturers: data } = await manufacturersApi.list();
        setManufacturers(data.filter(m => m.isActive));
      } catch (err) {
        console.error(err);
      }
    };
    void loadManufacturers();
  }, []);

  const loadProducts = useMemo(
    () =>
      async (params?: {
        categoryId?: string;
        manufacturerId?: string;
        manufacturerIds?: string[];
        tags?: ProductTag[];
        search?: string;
        onSale?: boolean;
        backInStock?: boolean;
        featured?: boolean;
        newArrival?: boolean;
        minPrice?: number;
        maxPrice?: number;
        vehicleYear?: string;
        vehicleMake?: string;
        vehicleModel?: string;
      }) => {
        setLoading(true);
        setError(null);
        try {
          const { products: data } = await productsApi.list(params as any);
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

  const applyFilters = () => {
    void loadProducts({
      categoryId: selectedCategory || undefined,
      manufacturerIds: selectedManufacturers.size ? Array.from(selectedManufacturers) : undefined,
      tags: selectedTags.size ? Array.from(selectedTags) : undefined,
      search: search || undefined,
      onSale: urlOnSale || undefined,
      backInStock: urlBackInStock || undefined,
      featured: urlFeatured || undefined,
      newArrival: urlNewArrival || undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 1000 ? maxPrice : undefined,
      vehicleYear: vehicleYear || undefined,
      vehicleMake: vehicleMake || undefined,
      vehicleModel: vehicleModel || undefined,
    });
  };

  // Auto-apply filters when selections change (except search which applies on Enter or button click)
  useEffect(() => {
    void loadProducts({
      categoryId: selectedCategory || undefined,
      manufacturerIds: selectedManufacturers.size ? Array.from(selectedManufacturers) : undefined,
      tags: selectedTags.size ? Array.from(selectedTags) : undefined,
      search: search || undefined,
      onSale: urlOnSale || undefined,
      backInStock: urlBackInStock || undefined,
      featured: urlFeatured || undefined,
      newArrival: urlNewArrival || undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 1000 ? maxPrice : undefined,
      vehicleYear: vehicleYear || undefined,
      vehicleMake: vehicleMake || undefined,
      vehicleModel: vehicleModel || undefined,
    });
  }, [
    selectedCategory,
    selectedManufacturers,
    selectedTags,
    minPrice,
    maxPrice,
    loadProducts,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    search,
    urlOnSale,
    urlBackInStock,
    urlFeatured,
    urlNewArrival,
  ]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedManufacturers(new Set());
    setSelectedTags(new Set());
    setMinPrice(0);
    setMaxPrice(1000);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('vehicleYear');
    newParams.delete('vehicleMake');
    newParams.delete('vehicleModel');
    newParams.delete('onSale');
    newParams.delete('backInStock');
    newParams.delete('featured');
    newParams.delete('newArrival');
    setSearchParams(newParams);
    // Products will auto-refresh via useEffect
  };

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

  const hasVehicleFilters = vehicleYear || vehicleMake || vehicleModel;
  const hasActiveFilters =
    search ||
    selectedCategory ||
    selectedManufacturers.size > 0 ||
    selectedTags.size > 0 ||
    minPrice > 0 ||
    maxPrice < 1000 ||
    hasVehicleFilters ||
    urlOnSale ||
    urlBackInStock ||
    urlFeatured ||
    urlNewArrival;

  // Sort products based on selected sort option
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      case 'recommended':
      default:
        return sorted;
    }
  }, [products, sortBy]);

  const clearVehicleFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('vehicleYear');
    newParams.delete('vehicleMake');
    newParams.delete('vehicleModel');
    setSearchParams(newParams);
  };

  return (
    <SiteLayout>
      <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-[1400px] mt-8">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <a href="/" className="hover:text-slate-900">Home</a>
            <span>›</span>
            <span className="text-slate-900 font-medium">Products</span>
          </div>

          {/* Vehicle Filter Banner */}
          {hasVehicleFilters && (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
              <span className="font-semibold text-blue-900">Filtering by vehicle:</span>
              {vehicleYear && (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  {vehicleYear}
                </span>
              )}
              {vehicleMake && (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  {vehicleMake}
                </span>
              )}
              {vehicleModel && (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  {vehicleModel}
                </span>
              )}
              <button
                type="button"
                onClick={clearVehicleFilters}
                className="ml-auto flex items-center gap-1 text-xs font-semibold text-blue-700 transition hover:text-blue-900"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          {/* Main Layout: Sidebar + Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters ? 'Filters Active' : 'Show Filters'}
            </button>

            {/* Left Sidebar - Filters */}
            <aside
              className={cn(
                'lg:w-72 flex-shrink-0',
                'fixed inset-0 z-50 lg:relative lg:z-auto',
                'bg-white lg:bg-transparent',
                sidebarOpen ? 'block' : 'hidden lg:block'
              )}
            >
              <div className="h-full overflow-y-auto lg:overflow-visible p-4 lg:p-0">
                {/* Mobile Close Button */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden absolute top-4 right-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-4">
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            applyFilters();
                          }
                        }}
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
                              left: `${(minPrice / 1000) * 100}%`,
                              right: `${100 - (maxPrice / 1000) * 100}%`
                            }}
                          />
                        </div>
                        {/* Min handle */}
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          value={minPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val <= maxPrice) setMinPrice(val);
                          }}
                          className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-800 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                          style={{ zIndex: minPrice > maxPrice - 100 ? 5 : 3 }}
                        />
                        {/* Max handle */}
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          value={maxPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= minPrice) setMaxPrice(val);
                          }}
                          className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-800 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                          style={{ zIndex: 4 }}
                        />
                      </div>
                      {/* Price labels */}
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium">{minPrice}</span>
                        <span className="font-medium">{maxPrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories Filter */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCategoryExpanded(!categoryExpanded)}
                      className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      <span>Categories</span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', categoryExpanded && 'rotate-180')} />
                    </button>
                    {categoryExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-200">
                        <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="category"
                              checked={!selectedCategory}
                              onChange={() => setSelectedCategory('')}
                              className="h-3.5 w-3.5 border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500"
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900">All Categories</span>
                          </label>
                          {categories.map((category) => (
                            <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name="category"
                                checked={selectedCategory === category.id}
                                onChange={() => setSelectedCategory(category.id)}
                                className="h-3.5 w-3.5 border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500"
                              />
                              <span className="text-sm text-slate-700 group-hover:text-slate-900">{category.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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

                  {/* Apply Filters Button */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                      Apply Filters
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content - Products Grid */}
            <main className="flex-1 min-w-0">
              {/* Page Title + Sort/View Controls */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Products</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Sort by:</span>
                      <Select
                        value={sortBy}
                        onChange={(value) => setSortBy(value as typeof sortBy)}
                        options={[
                          { value: 'recommended', label: 'Recommended' },
                          { value: 'price-asc', label: 'Price: Low to High' },
                          { value: 'price-desc', label: 'Price: High to Low' },
                          { value: 'newest', label: 'Newest' },
                        ]}
                        placeholder="Sort by"
                        className="min-w-[180px]"
                      />
                    </div>

                    {/* Per page */}
                    <div className="flex items-center gap-2">
                      <Select
                        value="20"
                        onChange={() => {}}
                        options={[
                          { value: '20', label: '20' },
                          { value: '40', label: '40' },
                          { value: '60', label: '60' },
                        ]}
                        placeholder="Items per page"
                        className="w-20"
                      />
                      <span className="text-sm text-slate-600">per page</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700 mb-6">
                  {error}
                </div>
              )}

              {/* Products Grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-full" />
                ))}
              </div>

              {/* Empty State */}
              {!loading && !error && !products.length && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-16 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Package className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">No products found</h3>
                  <p className="mb-4 text-sm text-slate-600">
                    Try adjusting your filters or search terms
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="aspect-square bg-slate-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 rounded bg-slate-200"></div>
                        <div className="h-4 w-2/3 rounded bg-slate-200"></div>
                        <div className="h-6 w-1/3 rounded bg-slate-200"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </SiteLayout>
  );
};
