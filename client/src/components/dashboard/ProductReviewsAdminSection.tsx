import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, ChevronLeft, RefreshCw, Square, Star, Trash2 } from 'lucide-react';
import { reviewsApi } from '../../api/reviews';
import { reviewerNamesApi } from '../../api/reviewerNames';
import type { Manufacturer } from '../../api/manufacturers';
import type { Category, Order, Product, ProductReview, ReviewerName } from '../../types/api';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';
import { Select } from '../ui/Select';
import type { StatusSetter } from './types';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';
type BadgeFilter = 'all' | 'featured' | 'new_arrival' | 'on_sale' | 'back_in_stock';
type RatingFilter = 'all' | '4' | '3' | '2' | '1';

const stockOptions: Array<{ value: StockFilter; label: string }> = [
  { value: 'all', label: 'All stock' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'backorder', label: 'Backorder' },
  { value: 'preorder', label: 'Preorder' },
];

const badgeOptions: Array<{ value: BadgeFilter; label: string }> = [
  { value: 'all', label: 'All badges' },
  { value: 'featured', label: 'Featured' },
  { value: 'new_arrival', label: 'New arrival' },
  { value: 'on_sale', label: 'On sale' },
  { value: 'back_in_stock', label: 'Back in stock' },
];

const ratingOptions: Array<{ value: RatingFilter; label: string }> = [
  { value: 'all', label: 'Any rating' },
  { value: '4', label: '4+ stars' },
  { value: '3', label: '3+ stars' },
  { value: '2', label: '2+ stars' },
  { value: '1', label: '1+ stars' },
];

const getEffectiveInventoryStatus = (product: Product): StockFilter => {
  const status = product.inventory?.status ?? 'in_stock';
  const allowBackorder = Boolean(product.inventory?.allowBackorder);
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  const lowStockThreshold =
    typeof product.inventory?.lowStockThreshold === 'number' ? product.inventory.lowStockThreshold : 0;

  if (status === 'preorder') return 'preorder';
  if (status === 'backorder' && quantity <= 0) return 'backorder';
  if (allowBackorder && quantity <= 0) return 'backorder';
  if (status === 'out_of_stock' || quantity <= 0) return 'out_of_stock';
  if (status === 'low_stock' || (lowStockThreshold > 0 && quantity <= lowStockThreshold)) {
    return 'low_stock';
  }
  return 'in_stock';
};

const isSaleActive = (product: Product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }
  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

const formatReviewDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const datePart = date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} - ${timePart}`;
};

const summarizeList = (values: string[]) => {
  if (!values.length) return '-';
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
};

interface ProductReviewsAdminSectionProps {
  products: Product[];
  categories: Category[];
  manufacturers: Manufacturer[];
  orders: Order[];
  onRefresh: () => Promise<void>;
  setStatus: StatusSetter;
}

export const ProductReviewsAdminSection: React.FC<ProductReviewsAdminSectionProps> = ({
  products,
  categories,
  manufacturers,
  orders,
  onRefresh,
  setStatus,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [brandFilter, setBrandFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());

  const [reviewerNames, setReviewerNames] = useState<ReviewerName[]>([]);
  const [newReviewerName, setNewReviewerName] = useState('');
  const [reviewForm, setReviewForm] = useState({
    reviewerName: '',
    rating: '5',
    comment: '',
  });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [adminCommentDrafts, setAdminCommentDrafts] = useState<Record<string, string>>({});

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const manufacturerNameById = useMemo(() => {
    const map = new Map<string, string>();
    manufacturers.forEach((manufacturer) => map.set(manufacturer.id, manufacturer.name));
    return map;
  }, [manufacturers]);

  const salesByProductId = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order) => {
      order.products.forEach((item) => {
        const current = map.get(item.productId) ?? 0;
        map.set(item.productId, current + (item.quantity || 0));
      });
    });
    return map;
  }, [orders]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      product.compatibility?.forEach((entry) => {
        if (entry.make) set.add(entry.make);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      product.compatibility?.forEach((entry) => {
        if (!entry.model) return;
        if (brandFilter && entry.make !== brandFilter) return;
        set.add(entry.model);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products, brandFilter]);

  useEffect(() => {
    const loadNames = async () => {
      try {
        const { names } = await reviewerNamesApi.list();
        setReviewerNames(names);
      } catch (error) {
        setStatus(null, error instanceof Error ? error.message : 'Unable to load reviewer names.');
      }
    };
    void loadNames();
  }, [setStatus]);

  useEffect(() => {
    if (!selectedProductId) {
      setReviews([]);
      setAdminCommentDrafts({});
      setSelectedReviewIds(new Set());
      return;
    }
    setSelectedReviewIds(new Set());
    let cancelled = false;
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const { reviews: data } = await reviewsApi.listByProduct(selectedProductId);
        if (cancelled) return;
        setReviews(data);
        setAdminCommentDrafts(
          data.reduce<Record<string, string>>((acc, review) => {
            acc[review.id] = review.adminComment ?? '';
            return acc;
          }, {})
        );
      } catch (error) {
        if (!cancelled) {
          setReviewsError(error instanceof Error ? error.message : 'Unable to load reviews.');
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [selectedProductId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minRating = ratingFilter === 'all' ? 0 : Number(ratingFilter);

    return products.filter((product) => {
      if (normalizedSearch) {
        const haystack = [
          product.name,
          product.sku,
          product.productCode,
          product.manufacturerName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (categoryFilter && product.categoryId !== categoryFilter) {
        return false;
      }

      if (manufacturerFilter && product.manufacturerId !== manufacturerFilter) {
        return false;
      }

      if (stockFilter !== 'all' && getEffectiveInventoryStatus(product) !== stockFilter) {
        return false;
      }

      if (badgeFilter !== 'all') {
        if (badgeFilter === 'featured' && !product.featured) return false;
        if (badgeFilter === 'new_arrival' && !product.newArrival) return false;
        if (badgeFilter === 'back_in_stock' && !product.restockedAt) return false;
        if (badgeFilter === 'on_sale' && !isSaleActive(product)) return false;
      }

      if (brandFilter || modelFilter) {
        if (!product.compatibility?.length) return false;
        const matches = product.compatibility.some((entry) => {
          if (brandFilter && entry.make !== brandFilter) return false;
          if (modelFilter && entry.model !== modelFilter) return false;
          return true;
        });
        if (!matches) return false;
      }

      const ratingValue = product.reviewsSummary?.averageRating ?? 0;
      if (minRating > 0 && ratingValue < minRating) {
        return false;
      }

      return true;
    });
  }, [
    products,
    search,
    categoryFilter,
    manufacturerFilter,
    stockFilter,
    badgeFilter,
    ratingFilter,
    brandFilter,
    modelFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, manufacturerFilter, stockFilter, badgeFilter, ratingFilter, brandFilter, modelFilter, perPage]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  const toggleReviewSelection = (reviewId: string) => {
    setSelectedReviewIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedReviewIds((current) => {
      if (reviews.length && current.size === reviews.length) {
        return new Set();
      }
      return new Set(reviews.map((review) => review.id));
    });
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await reviewsApi.delete(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setSelectedReviewIds((current) => {
        const next = new Set(current);
        next.delete(reviewId);
        return next;
      });
      await onRefresh();
      setStatus('Review removed.');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to delete review.');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedReviewIds);
    if (!ids.length) return;
    try {
      await reviewsApi.bulkDelete(ids);
      setReviews((current) => current.filter((review) => !selectedReviewIds.has(review.id)));
      setSelectedReviewIds(new Set());
      await onRefresh();
      setStatus('Selected reviews removed.');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to delete selected reviews.');
    }
  };

  const handleSaveAdminComment = async (reviewId: string) => {
    const comment = adminCommentDrafts[reviewId] ?? '';
    try {
      const { review } = await reviewsApi.update(reviewId, { adminComment: comment });
      setReviews((current) => current.map((item) => (item.id === reviewId ? review : item)));
      setStatus('Admin comment saved.');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to save admin comment.');
    }
  };

  const handleAddReviewerName = async () => {
    const trimmed = newReviewerName.trim();
    if (!trimmed) {
      return;
    }
    try {
      const { name } = await reviewerNamesApi.create({ name: trimmed });
      setReviewerNames((current) => {
        const exists = current.some((item) => item.id === name.id);
        if (exists) return current;
        return [...current, name];
      });
      setReviewForm((current) => ({ ...current, reviewerName: name.name }));
      setNewReviewerName('');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to add reviewer name.');
    }
  };

  const handleCreateReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProductId) return;
    const reviewerName = reviewForm.reviewerName.trim();
    const rating = Number(reviewForm.rating);
    const comment = reviewForm.comment.trim();
    if (!reviewerName) {
      setStatus(null, 'Select a reviewer name before saving.');
      return;
    }
    if (!comment) {
      setStatus(null, 'Provide a review comment.');
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setStatus(null, 'Rating must be between 1 and 5.');
      return;
    }
    setReviewSaving(true);
    try {
      const { review } = await reviewsApi.createForProduct(selectedProductId, {
        reviewerName,
        rating,
        comment,
      });
      setReviews((current) => [review, ...current]);
      setReviewForm({ reviewerName, rating: '5', comment: '' });
      await onRefresh();
      setStatus('Review added.');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to add review.');
    } finally {
      setReviewSaving(false);
    }
  };

  const reviewerOptions = useMemo(() => {
    return reviewerNames
      .slice()
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      })
      .map((name) => ({ value: name.name, label: name.name }));
  }, [reviewerNames]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories]
  );

  const manufacturerOptions = useMemo(
    () => [
      { value: '', label: 'All manufacturers' },
      ...manufacturers.map((manufacturer) => ({ value: manufacturer.id, label: manufacturer.name })),
    ],
    [manufacturers]
  );

  const brandFilterOptions = useMemo(
    () => [
      { value: '', label: 'All brands' },
      ...brandOptions.map((brand) => ({ value: brand, label: brand })),
    ],
    [brandOptions]
  );

  const modelFilterOptions = useMemo(
    () => [
      { value: '', label: 'All models' },
      ...modelOptions.map((model) => ({ value: model, label: model })),
    ],
    [modelOptions]
  );

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setManufacturerFilter('');
    setStockFilter('all');
    setBadgeFilter('all');
    setRatingFilter('all');
    setBrandFilter('');
    setModelFilter('');
  };

  const refreshReviews = async () => {
    if (!selectedProductId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const { reviews: data } = await reviewsApi.listByProduct(selectedProductId);
      setReviews(data);
      setAdminCommentDrafts(
        data.reduce<Record<string, string>>((acc, review) => {
          acc[review.id] = review.adminComment ?? '';
          return acc;
        }, {})
      );
    } catch (error) {
      setReviewsError(error instanceof Error ? error.message : 'Unable to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
      if (selectedProductId) {
        await refreshReviews();
      }
      setStatus('Product list refreshed.');
    } catch (error) {
      setStatus(null, error instanceof Error ? error.message : 'Unable to refresh product list.');
    }
  };

  if (selectedProduct) {
    const stockStatus = getEffectiveInventoryStatus(selectedProduct);
    const stockLabel = stockOptions.find((option) => option.value === stockStatus)?.label ?? 'In stock';
    const stockQuantity = typeof selectedProduct.inventory?.quantity === 'number' ? selectedProduct.inventory.quantity : 0;
    const saleActive = isSaleActive(selectedProduct);
    const displayPrice = saleActive && typeof selectedProduct.salePrice === 'number' ? selectedProduct.salePrice : selectedProduct.price;
    const salesCount = salesByProductId.get(selectedProduct.id) ?? 0;
    const badgeLabels: string[] = [];
    if (selectedProduct.featured) badgeLabels.push('Featured');
    if (selectedProduct.newArrival) badgeLabels.push('New arrival');
    if (selectedProduct.restockedAt) badgeLabels.push('Back in stock');
    if (saleActive) badgeLabels.push('On sale');
    const brandList = summarizeList(
      Array.from(new Set((selectedProduct.compatibility ?? []).map((entry) => entry.make).filter(Boolean)))
    );
    const modelList = summarizeList(
      Array.from(new Set((selectedProduct.compatibility ?? []).map((entry) => entry.model).filter(Boolean)))
    );
    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
        : selectedProduct.reviewsSummary?.averageRating ?? 0;
    const totalReviews = reviews.length || selectedProduct.reviewsSummary?.reviewCount || 0;
    const allSelected = reviews.length > 0 && selectedReviewIds.size === reviews.length;

    return (
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedProductId(null)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to list
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={selectedProduct.images?.[0] ?? 'https://placehold.co/80x80?text=Product'}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedProduct.name}</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Category: {categoryNameById.get(selectedProduct.categoryId ?? '') ?? '-'}</span>
                  <span>Manufacturer: {manufacturerNameById.get(selectedProduct.manufacturerId ?? '') ?? '-'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Brand: {brandList}</span>
                  <span>Model: {modelList}</span>
                </div>
                {badgeLabels.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {badgeLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">Price</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(displayPrice ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">Stock</p>
                <p className="text-sm font-semibold text-slate-900">
                  {stockLabel} ({stockQuantity})
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">Sales</p>
                <p className="text-sm font-semibold text-slate-900">{salesCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">Rating</p>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                  <Star className={cn('h-4 w-4', totalReviews ? 'text-amber-500' : 'text-slate-300')} />
                  {totalReviews ? `${averageRating.toFixed(1)} (${totalReviews})` : 'No reviews'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reviews</h3>
                <p className="text-xs text-slate-500">{totalReviews} total</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  disabled={!reviews.length}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allSelected ? 'Deselect' : 'Select all'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={selectedReviewIds.size === 0}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected
                </button>
              </div>
            </div>
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-border">
              {reviewsLoading && (
                <div className="px-4 py-6 text-sm text-slate-600">Loading reviews...</div>
              )}
              {reviewsError && !reviewsLoading && (
                <div className="px-4 py-6 text-sm text-rose-600">{reviewsError}</div>
              )}
              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-600">No reviews yet.</div>
              )}
              {!reviewsLoading &&
                !reviewsError &&
                reviews.map((review) => {
                  const isSelected = selectedReviewIds.has(review.id);
                  return (
                    <div
                      key={review.id}
                      className={cn('px-4 py-4', isSelected && 'bg-rose-50/60')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleReviewSelection(review.id)}
                            className="mt-1 text-slate-500 transition hover:text-rose-600"
                            aria-label="Select review"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                              {review.isVerifiedPurchase && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                  Verified
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {formatReviewDate(review.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={index}
                                  className={cn(
                                    'h-3 w-3',
                                    index < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteReview(review.id)}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                          aria-label="Delete review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">{review.comment}</p>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <label className="text-xs font-semibold text-slate-600">Admin comment</label>
                        <textarea
                          value={adminCommentDrafts[review.id] ?? ''}
                          onChange={(event) =>
                            setAdminCommentDrafts((current) => ({
                              ...current,
                              [review.id]: event.target.value,
                            }))
                          }
                          rows={3}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Add a reply or internal note..."
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleSaveAdminComment(review.id)}
                            className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
                          >
                            Save comment
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Add review</h3>
              <form onSubmit={handleCreateReview} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Reviewer name</label>
                  <Select
                    value={reviewForm.reviewerName}
                    onChange={(value) => setReviewForm((current) => ({ ...current, reviewerName: value }))}
                    options={reviewerOptions}
                    placeholder="Select reviewer"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Add new name</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newReviewerName}
                      onChange={(event) => setNewReviewerName(event.target.value)}
                      placeholder="Type a name"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddReviewerName()}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Rating</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Fair</option>
                    <option value="1">1 - Poor</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Comment</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Share the experience..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={reviewSaving}
                  className={cn(
                    'w-full rounded-xl px-4 py-2 text-sm font-semibold transition',
                    reviewSaving
                      ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                      : 'border border-primary bg-primary text-white hover:bg-primary/90'
                  )}
                >
                  {reviewSaving ? 'Saving...' : 'Add review'}
                </button>
              </form>
            </div>

            {reviewerNames.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Reviewer names</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reviewerNames.map((name) => (
                    <span
                      key={name.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {name.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const pageStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const pageEnd = Math.min(filteredProducts.length, safePage * perPage);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Product list</h2>
          <p className="text-sm text-slate-600">Manage product reviews and ratings.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, SKU, code..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
              placeholder="All categories"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Manufacturer</label>
            <Select
              value={manufacturerFilter}
              onChange={setManufacturerFilter}
              options={manufacturerOptions}
              placeholder="All manufacturers"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Stock</label>
            <Select
              value={stockFilter}
              onChange={(value) => setStockFilter(value as StockFilter)}
              options={stockOptions.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Badge</label>
            <Select
              value={badgeFilter}
              onChange={(value) => setBadgeFilter(value as BadgeFilter)}
              options={badgeOptions.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rating</label>
            <Select
              value={ratingFilter}
              onChange={(value) => setRatingFilter(value as RatingFilter)}
              options={ratingOptions.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Brand</label>
            <Select
              value={brandFilter}
              onChange={setBrandFilter}
              options={brandFilterOptions}
              placeholder="All brands"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Model</label>
            <Select
              value={modelFilter}
              onChange={setModelFilter}
              options={modelFilterOptions}
              placeholder="All models"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            Clear filters
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Per page</span>
            <Select
              value={String(perPage)}
              onChange={(value) => setPerPage(Number(value))}
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '40', label: '40' },
                { value: '80', label: '80' },
              ]}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-auto" style={{ height: '80vh' }}>
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Sales</th>
                <th className="px-4 py-3 font-semibold">Badges</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Manufacturer</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {pagedProducts.map((product) => {
                const stockStatus = getEffectiveInventoryStatus(product);
                const stockLabel = stockOptions.find((option) => option.value === stockStatus)?.label ?? 'In stock';
                const stockQty = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
                const saleActive = isSaleActive(product);
                const displayPrice =
                  saleActive && typeof product.salePrice === 'number' ? product.salePrice : product.price;
                const salesCount = salesByProductId.get(product.id) ?? 0;
                const badgeLabels: string[] = [];
                if (product.featured) badgeLabels.push('Featured');
                if (product.newArrival) badgeLabels.push('New arrival');
                if (product.restockedAt) badgeLabels.push('Back in stock');
                if (saleActive) badgeLabels.push('On sale');
                const brandList = summarizeList(
                  Array.from(new Set((product.compatibility ?? []).map((entry) => entry.make).filter(Boolean)))
                );
                const modelList = summarizeList(
                  Array.from(new Set((product.compatibility ?? []).map((entry) => entry.model).filter(Boolean)))
                );
                const ratingValue = product.reviewsSummary?.averageRating ?? 0;
                const ratingCount = product.reviewsSummary?.reviewCount ?? 0;

                return (
                  <tr
                    key={product.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img
                            src={product.images?.[0] ?? 'https://placehold.co/64x64?text=Product'}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sku || product.productCode || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {stockLabel} ({stockQty})
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {saleActive && (
                        <span className="mr-2 text-[11px] text-slate-400 line-through">
                          {formatCurrency(product.price ?? 0)}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900">{formatCurrency(displayPrice ?? 0)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{salesCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {badgeLabels.length ? (
                          badgeLabels.map((label) => (
                            <span
                              key={`${product.id}-${label}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600"
                            >
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {categoryNameById.get(product.categoryId ?? '') ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {manufacturerNameById.get(product.manufacturerId ?? '') ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{brandList}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{modelList}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {ratingCount ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold text-slate-700">{ratingValue.toFixed(1)}</span>
                          <span className="text-slate-500">({ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!pagedProducts.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                    No products match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-900">{pageStart}</span>-<span className="font-semibold text-slate-900">{pageEnd}</span> of{' '}
            <span className="font-semibold text-slate-900">{filteredProducts.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
