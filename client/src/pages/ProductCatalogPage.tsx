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
import { getEffectiveInventoryStatus, isBackInStock, isNewArrival, isOnSale, isComingSoon } from '../utils/productStatus';

type AvailabilityFilter = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';
type BadgeFilter = 'on_sale' | 'back_in_stock' | 'featured' | 'new_arrival' | 'coming_soon';

const availabilityOptions: Array<{ id: AvailabilityFilter; label: string }> = [
  { id: 'in_stock', label: 'In stock' },
  { id: 'low_stock', label: 'Low stock' },
  { id: 'out_of_stock', label: 'Out of stock' },
  { id: 'backorder', label: 'Backorder' },
  { id: 'preorder', label: 'Preorder' },
];

const badgeOptions: Array<{ id: BadgeFilter; label: string }> = [
  { id: 'on_sale', label: 'On sale' },
  { id: 'back_in_stock', label: 'Back in stock' },
  { id: 'featured', label: 'Featured' },
  { id: 'new_arrival', label: 'New arrival' },
  { id: 'coming_soon', label: 'Coming soon' },
];

export const ProductCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || '';
  const vehicleYear = searchParams.get('vehicleYear') || '';
  const vehicleMake = searchParams.get('vehicleMake') || '';
  const vehicleModel = searchParams.get('vehicleModel') || '';
  const urlTags = searchParams.get('tags') || '';
  const urlOnSale = ['true', '1', 'yes'].includes((searchParams.get('onSale') || '').toLowerCase());
  const urlBackInStock = ['true', '1', 'yes'].includes((searchParams.get('backInStock') || '').toLowerCase());
  const urlFeatured = ['true', '1', 'yes'].includes((searchParams.get('featured') || '').toLowerCase());
  const urlNewArrival = ['true', '1', 'yes'].includes((searchParams.get('newArrival') || '').toLowerCase());
  const urlTagList = urlTags
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const urlComingSoon = urlTagList.includes('coming soon');

  const buildBadgeSelection = () => {
    const next = new Set<BadgeFilter>();
    if (urlOnSale) next.add('on_sale');
    if (urlBackInStock) next.add('back_in_stock');
    if (urlFeatured) next.add('featured');
    if (urlNewArrival) next.add('new_arrival');
    if (urlComingSoon) next.add('coming_soon');
    return next;
  };

  const buildBrandSelection = () => {
    const next = new Set<string>();
    if (vehicleMake) {
      next.add(vehicleMake);
    }
    return next;
  };

  const buildModelSelection = () => {
    const next = new Set<string>();
    if (vehicleModel) {
      next.add(vehicleModel);
    }
    return next;
  };

  // State
  const [search, setSearch] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [selectedAvailability, setSelectedAvailability] = useState<Set<AvailabilityFilter>>(new Set());
  const [selectedBadges, setSelectedBadges] = useState<Set<BadgeFilter>>(() => buildBadgeSelection());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => buildBrandSelection());
  const [selectedModels, setSelectedModels] = useState<Set<string>>(() => buildModelSelection());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'newest'>('recommended');
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [manufacturerExpanded, setManufacturerExpanded] = useState(true);
  const [brandExpanded, setBrandExpanded] = useState(true);
  const [modelExpanded, setModelExpanded] = useState(true);

  // Sync search value from URL (used by header search)
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setSelectedBadges(buildBadgeSelection());
  }, [urlOnSale, urlBackInStock, urlFeatured, urlNewArrival, urlComingSoon]);

  useEffect(() => {
    setSelectedBrands(buildBrandSelection());
  }, [vehicleMake]);

  useEffect(() => {
    setSelectedModels(buildModelSelection());
  }, [vehicleModel]);

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

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const { makes } = await productsApi.getVehicleCompatibilityOptions();
        setBrandOptions(makes);
      } catch (err) {
        console.error(err);
      }
    };
    void loadBrands();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const selected = Array.from(selectedBrands);
        const make = selected.length === 1 ? selected[0] : undefined;
        const { models } = await productsApi.getVehicleCompatibilityOptions(make ? { make } : undefined);
        setModelOptions(models);
      } catch (err) {
        console.error(err);
      }
    };
    void loadModels();
  }, [selectedBrands]);

  useEffect(() => {
    if (!modelOptions.length) {
      setSelectedModels(new Set());
      return;
    }
    setSelectedModels((current) => {
      const next = new Set<string>();
      current.forEach((model) => {
        if (modelOptions.includes(model)) {
          next.add(model);
        }
      });
      return next;
    });
  }, [modelOptions]);

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

  // Auto-apply filters when selections change
  useEffect(() => {
    void loadProducts({
      categoryId: selectedCategory || undefined,
      manufacturerIds: selectedManufacturers.size ? Array.from(selectedManufacturers) : undefined,
      search: search || undefined,
      tags: selectedBadges.has('coming_soon') ? ['coming soon'] : undefined,
      onSale: selectedBadges.has('on_sale') || undefined,
      backInStock: selectedBadges.has('back_in_stock') || undefined,
      featured: selectedBadges.has('featured') || undefined,
      newArrival: selectedBadges.has('new_arrival') || undefined,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 1000 ? maxPrice : undefined,
      vehicleYear: vehicleYear || undefined,
      vehicleMake: vehicleMake || undefined,
      vehicleModel: vehicleModel || undefined,
    });
  }, [
    selectedCategory,
    selectedManufacturers,
    selectedBadges,
    minPrice,
    maxPrice,
    loadProducts,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    search,
  ]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedManufacturers(new Set());
    setSelectedAvailability(new Set());
    setSelectedBadges(new Set());
    setSelectedBrands(new Set());
    setSelectedModels(new Set());
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
    newParams.delete('tags');
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

  const toggleAvailability = (filterId: AvailabilityFilter) => {
    setSelectedAvailability((current) => {
      const next = new Set(current);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  };

  const toggleBadge = (filterId: BadgeFilter) => {
    setSelectedBadges((current) => {
      const next = new Set(current);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((current) => {
      const next = new Set(current);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  };

  const toggleModel = (model: string) => {
    setSelectedModels((current) => {
      const next = new Set(current);
      if (next.has(model)) {
        next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  };

  const hasVehicleFilters = vehicleYear || vehicleMake || vehicleModel;
  const hasActiveFilters =
    search ||
    selectedCategory ||
    selectedManufacturers.size > 0 ||
    selectedAvailability.size > 0 ||
    selectedBadges.size > 0 ||
    selectedBrands.size > 0 ||
    selectedModels.size > 0 ||
    minPrice > 0 ||
    maxPrice < 1000 ||
    hasVehicleFilters;

  const matchesAvailability = (product: Product) => {
    if (!selectedAvailability.size) return true;
    const status = getEffectiveInventoryStatus(product) as AvailabilityFilter;
    return selectedAvailability.has(status);
  };

  const matchesBadges = (product: Product) => {
    if (!selectedBadges.size) return true;
    if (selectedBadges.has('featured') && !product.featured) return false;
    if (selectedBadges.has('new_arrival') && !isNewArrival(product)) return false;
    if (selectedBadges.has('back_in_stock') && !isBackInStock(product)) return false;
    if (selectedBadges.has('on_sale') && !isOnSale(product)) return false;
    if (selectedBadges.has('coming_soon') && !isComingSoon(product)) return false;
    return true;
  };

  const matchesBrandModel = (product: Product) => {
    if (!selectedBrands.size && !selectedModels.size) return true;
    if (!product.compatibility?.length) return false;
    if (selectedBrands.size && selectedModels.size) {
      return product.compatibility.some(
        (entry) => selectedBrands.has(entry.make) && selectedModels.has(entry.model)
      );
    }
    if (selectedBrands.size) {
      return product.compatibility.some((entry) => selectedBrands.has(entry.make));
    }
    return product.compatibility.some((entry) => selectedModels.has(entry.model));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        matchesAvailability(product) && matchesBadges(product) && matchesBrandModel(product)
    );
  }, [products, selectedAvailability, selectedBadges, selectedBrands, selectedModels]);

  // Sort products based on selected sort option
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
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
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = sortedProducts.slice((safePage - 1) * perPage, safePage * perPage);
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [safePage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    selectedManufacturers,
    selectedAvailability,
    selectedBadges,
    selectedBrands,
    selectedModels,
    minPrice,
    maxPrice,
    sortBy,
    search,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    perPage,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const clearVehicleFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('vehicleYear');
    newParams.delete('vehicleMake');
    newParams.delete('vehicleModel');
    setSearchParams(newParams);
    setSelectedBrands(new Set());
    setSelectedModels(new Set());
  };

  return (
    <SiteLayout>
      <div className="bg-slate-50 min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-[1400px] mt-8">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <a href="/" className="hover:text-slate-900">Home</a>
            <span>/</span>
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
                  {hasActiveFilters && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
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

                  {/* Availability Filter */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Availability</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {availabilityOptions.map((option) => {
                        const active = selectedAvailability.has(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleAvailability(option.id)}
                            className={cn(
                              'px-3 py-2 rounded-lg text-xs font-medium transition-all border bg-white shadow-sm',
                              active
                                ? 'border-red-600 text-red-600 ring-2 ring-red-600 ring-opacity-50'
                                : 'border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50'
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Badges & Sales Filter */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">Badges & Sales</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {badgeOptions.map((option) => {
                        const active = selectedBadges.has(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleBadge(option.id)}
                            className={cn(
                              'px-3 py-2 rounded-lg text-xs font-medium transition-all border bg-white shadow-sm',
                              active
                                ? 'border-red-600 text-red-600 ring-2 ring-red-600 ring-opacity-50'
                                : 'border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50'
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
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
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setManufacturerExpanded(!manufacturerExpanded)}
                        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        <span>Manufacturers</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', manufacturerExpanded && 'rotate-180')} />
                      </button>
                      {manufacturerExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-200">
                          <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
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
                    </div>
                  )}

                  {/* Brands Filter */}
                  {brandOptions.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setBrandExpanded(!brandExpanded)}
                        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        <span>Brands</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', brandExpanded && 'rotate-180')} />
                      </button>
                      {brandExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-200">
                          <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
                            {brandOptions.map((brand) => {
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
                    </div>
                  )}

                  {/* Models Filter */}
                  {modelOptions.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setModelExpanded(!modelExpanded)}
                        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        <span>Models</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', modelExpanded && 'rotate-180')} />
                      </button>
                      {modelExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-200">
                          <div className="space-y-2 max-h-48 overflow-y-auto mt-3">
                            {modelOptions.map((model) => {
                              const isSelected = selectedModels.has(model);
                              return (
                                <label key={model} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleModel(model)}
                                    className="h-3.5 w-3.5 border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500 rounded"
                                  />
                                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{model}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                      {loading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
                    {/* Sort */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
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
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Select
                        value={String(perPage)}
                        onChange={(value) => setPerPage(Number(value))}
                        options={[
                          { value: '20', label: '20' },
                          { value: '40', label: '40' },
                          { value: '60', label: '60' },
                        ]}
                        placeholder="Items per page"
                        className="w-24"
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
                {pagedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-full" />
                ))}
              </div>

              {!loading && !error && filteredProducts.length > 0 && totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-slate-600">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safePage <= 1}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                          page === safePage
                            ? 'bg-red-600 text-white'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safePage >= totalPages}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && !filteredProducts.length && (
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
