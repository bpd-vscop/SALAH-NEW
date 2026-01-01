import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreditCard, Headphones, Heart, Shield, ShoppingCart } from 'lucide-react';
import { categoriesApi } from '../api/categories';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { ProductMediaGallery } from '../components/product/ProductMediaGallery';
import { ProductDetailTabs } from '../components/product/ProductDetailTabs';
import { ProductRecommendationRail } from '../components/product/ProductRecommendationRail';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import type { Category, Product, ProductInventoryStatus, ProductVariation } from '../types/api';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

type InventoryStatusMeta = {
  label: string;
  badge: string;
  description: string;
};

const inventoryStatusMeta: Record<ProductInventoryStatus, InventoryStatusMeta> = {
  in_stock: {
    label: 'In stock',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Ships immediately from our primary warehouse.',
  },
  low_stock: {
    label: 'Low stock',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Only a limited quantity remains. Order soon to reserve yours.',
  },
  out_of_stock: {
    label: 'Out of stock',
    badge: 'border-red-200 bg-red-50 text-red-700',
    description: 'Currently unavailable. Check back soon or contact support for ETA.',
  },
  backorder: {
    label: 'Available on backorder',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Secure your order now. We ship as soon as replenishment arrives.',
  },
  preorder: {
    label: 'Pre-order',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    description: 'Reserve upcoming inventory and be first in line when stock lands.',
  },
};

const buildCategoryTrail = async (categoryId: string): Promise<Category[]> => {
  const trail: Category[] = [];
  const visited = new Set<string>();
  let current: string | null = categoryId;

  while (current && !visited.has(current)) {
    visited.add(current);
    try {
      const { category } = await categoriesApi.get(current);
      trail.unshift(category);
      current = category.parentId;
    } catch (err) {
      console.error('Unable to resolve category trail', err);
      break;
    }
  }

  return trail;
};

const fetchManufacturerById = async (manufacturerId?: string | null): Promise<Manufacturer | null> => {
  if (!manufacturerId) return null;
  try {
    const { manufacturers } = await manufacturersApi.list();
    return manufacturers.find((item) => item.id === manufacturerId) ?? null;
  } catch (err) {
    console.error('Unable to load manufacturer', err);
    return null;
  }
};

const fetchProductsByIds = async (ids?: string[]): Promise<Product[]> => {
  if (!ids?.length) return [];
  const uniqueIds = Array.from(new Set(ids));
  const results = await Promise.all(
    uniqueIds.map(async (productId) => {
      try {
        const { product } = await productsApi.get(productId);
        return product;
      } catch (err) {
        console.warn(`Unable to load recommended product ${productId}`, err);
        return null;
      }
    })
  );
  return results.filter((item): item is Product => Boolean(item));
};

const variationLabel = (variation: ProductVariation, fallbackIndex: number): string => {
  if (variation.name) {
    return variation.name;
  }
  if (variation.attributes && Object.keys(variation.attributes).length) {
    return Object.entries(variation.attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' • ');
  }
  return `Option ${fallbackIndex + 1}`;
};

const formatDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryTrail, setCategoryTrail] = useState<Category[]>([]);
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<Product[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const { user } = useAuth();
  const { addItem } = useCart();
  const { items: wishlistItems, addItem: addWishlistItem, removeItem: removeWishlistItem } = useWishlist();
  const isSignedInClient = user?.role === 'client';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: data } = await productsApi.get(id);
        if (cancelled) return;
        setProduct(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load product');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!product) {
      setCategoryTrail([]);
      setManufacturer(null);
      setRelatedProducts([]);
      setUpsellProducts([]);
      setCrossSellProducts([]);
      setSelectedVariationId(null);
      setQuantity(1);
      return;
    }

    let cancelled = false;

    const loadSupportingData = async () => {
      try {
        const [trail, manufacturerRecord, related, upsell, crossSell] = await Promise.all([
          buildCategoryTrail(product.categoryId),
          fetchManufacturerById(product.manufacturerId),
          fetchProductsByIds(product.relatedProductIds),
          fetchProductsByIds(product.upsellProductIds),
          fetchProductsByIds(product.crossSellProductIds),
        ]);

        if (cancelled) return;
        setCategoryTrail(trail);
        setManufacturer(manufacturerRecord);
        setRelatedProducts(related);
        setUpsellProducts(upsell);
        setCrossSellProducts(crossSell);
        setSelectedVariationId(product.variations?.[0]?.id ?? null);
        setQuantity(1);
      } catch (err) {
        console.error('Unable to load supporting data', err);
      }
    };

    void loadSupportingData();

    return () => {
      cancelled = true;
    };
  }, [product]);

  const activeVariation = useMemo(() => {
    if (!product?.variations?.length) return null;
    if (selectedVariationId) {
      return product.variations.find((item) => item.id === selectedVariationId) ?? product.variations[0];
    }
    return product.variations[0];
  }, [product, selectedVariationId]);

  const saleData = useMemo(() => {
    if (!product) {
      return { basePrice: 0, salePrice: null as number | null, saleActive: false };
    }
    const basePrice =
      typeof activeVariation?.price === 'number' ? activeVariation.price : product.price ?? 0;
    let salePrice =
      typeof activeVariation?.salePrice === 'number'
        ? activeVariation.salePrice
        : product.salePrice ?? null;

    let saleActive = false;

    if (typeof salePrice === 'number' && salePrice < basePrice) {
      if (typeof activeVariation?.salePrice === 'number') {
        saleActive = true;
      } else {
        const now = new Date();
        const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
        const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
        saleActive = startOk && endOk;
      }
    } else {
      salePrice = null;
    }

    return { basePrice, salePrice, saleActive };
  }, [product, activeVariation]);

  const displayPrice = saleData.saleActive && saleData.salePrice !== null ? saleData.salePrice : saleData.basePrice;
  const savings = saleData.saleActive && saleData.salePrice !== null ? saleData.basePrice - saleData.salePrice : 0;
  const discountPercent =
    saleData.saleActive && saleData.salePrice !== null && saleData.basePrice > 0
      ? Math.round((1 - saleData.salePrice / saleData.basePrice) * 100)
      : 0;

  const inventoryStatus: ProductInventoryStatus =
    product?.inventory?.status ?? 'in_stock';
  const inventoryMeta = inventoryStatusMeta[inventoryStatus] ?? inventoryStatusMeta.in_stock;
  const allowBackorder =
    activeVariation?.allowBackorder ?? product?.inventory?.allowBackorder ?? false;

  const availableQuantity =
    typeof activeVariation?.stockQuantity === 'number'
      ? activeVariation.stockQuantity
      : product?.inventory?.quantity ?? null;

  const maxQuantity = allowBackorder
    ? Number.POSITIVE_INFINITY
    : typeof availableQuantity === 'number'
      ? availableQuantity
      : Number.POSITIVE_INFINITY;

  const disableAddToCart =
    !allowBackorder &&
    ((Number.isFinite(maxQuantity) && maxQuantity <= 0) || inventoryStatus === 'out_of_stock');

  const isLowStock =
    typeof product?.inventory?.quantity === 'number' &&
    typeof product.inventory.lowStockThreshold === 'number' &&
    product.inventory.quantity > 0 &&
    product.inventory.quantity <= product.inventory.lowStockThreshold;

  const compatibilityMakes = useMemo(() => {
    if (!product?.compatibility?.length) return null;
    const set = new Set<string>();
    product.compatibility.forEach((entry) => {
      set.add(entry.make);
    });
    return Array.from(set);
  }, [product]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((current) => {
      const next = Math.max(1, current + delta);
      if (Number.isFinite(maxQuantity)) {
        return Math.min(next, maxQuantity as number);
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ productId: product.id, quantity }, product);
  };

  const isInWishlist = Boolean(product && wishlistItems.some((line) => line.productId === product.id));

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!isSignedInClient) {
      window.dispatchEvent(
        new CustomEvent('openAuthPrompt', {
          detail: {
            title: 'Sign in required',
            message: 'Please sign in or sign up with a client account to add this product to your wishlist.',
          },
        })
      );
      return;
    }
    if (isInWishlist) {
      await removeWishlistItem(product.id);
    } else {
      await addWishlistItem({ productId: product.id, quantity: 1 }, product);
    }
  };

  const handleReportIncorrectInfo = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('openContactWidget', { detail: { view: 'email' } }));
  };


  return (
    <SiteLayout>
      <div className="mx-auto w-[88%] py-8">
        {loading && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Loading product details...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        )}
        {product && !loading && !error && (
          <article className="space-y-10">
          <header className="space-y-6">
            <nav className="text-xs text-muted">
              <Link to="/" className="font-medium text-slate-600 transition hover:text-primary">Home</Link>
              <span className="mx-2">/</span>
              <Link to="/products" className="font-medium text-slate-600 transition hover:text-primary">Products</Link>
              {categoryTrail.map((category) => (
                <span key={category.id}>
                  <span className="mx-2">/</span>
                  <Link
                    to={`/categories/${category.id}`}
                    className="font-medium text-slate-600 transition hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </span>
              ))}
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900">{product.name}</span>
            </nav>
            {product.badges?.length ? (
              <div className="flex flex-wrap gap-2">
                {product.badges.map((badge, index) => (
                  <span
                    key={`${badge.label}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {badge.icon ? (
                      <span aria-hidden="true" className="text-primary/80">{badge.icon}</span>
                    ) : null}
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          <section className="grid gap-10 rounded-3xl border border-border bg-surface p-6 shadow-sm xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <ProductMediaGallery name={product.name} images={product.images} videoUrls={product.videoUrls} />

            <div className="flex flex-col gap-6">
              {/* Product Title Section */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-primary/80">Product overview</span>
                <h1 className="text-3xl font-semibold text-slate-900 lg:text-4xl">{product.name}</h1>
                {product.shortDescription ? (
                  <p className="text-sm text-muted">
                    {product.shortDescription}
                  </p>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', inventoryMeta.badge)}>
                    <span>{inventoryMeta.label}</span>
                    {isLowStock ? <span className="rounded-full bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white">Low</span> : null}
                  </div>
                  {savings > 0 && (
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
                      Save {formatCurrency(savings)} ({discountPercent}%)
                    </span>
                  )}
                  {product.taxClass ? (
                    <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted">
                      Tax class: {product.taxClass}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <span className="text-3xl font-semibold text-slate-900">{formatCurrency(displayPrice)}</span>
                    {saleData.saleActive && saleData.salePrice !== null ? (
                      <span className="text-lg text-muted line-through">{formatCurrency(saleData.basePrice)}</span>
                    ) : null}
                  </div>
                  {saleData.saleActive && product.saleEndDate ? (
                    <p className="text-xs font-medium text-red-600">
                      Sale ends {formatDate(product.saleEndDate)} or while stock lasts.
                    </p>
                  ) : null}
                  <p className="text-sm text-muted">{inventoryMeta.description}</p>
                  {product.inventory?.leadTime && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Estimated lead time: <span className="font-semibold text-slate-900">{product.inventory.leadTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {product.variations?.length ? (
                <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Available configurations</h2>
                    <span className="text-xs text-muted">Select one</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.map((variation, index) => (
                      <button
                        key={variation.id ?? index}
                        type="button"
                        onClick={() => setSelectedVariationId(variation.id ?? null)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          (variation.id ?? null) === selectedVariationId
                            ? 'border-primary bg-white text-primary shadow-sm'
                            : 'border-border bg-white text-slate-700 hover:border-primary hover:text-primary'
                        )}
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{variationLabel(variation, index)}</span>
                          {typeof variation.price === 'number' && variation.price !== product.price ? (
                            <span className="text-xs text-muted">
                              {formatCurrency(variation.price)}
                              {typeof variation.salePrice === 'number' && variation.salePrice < variation.price ? (
                                <>
                                  {' '}
                                  <span className="text-red-600">{formatCurrency(variation.salePrice)}</span>
                                </>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      className="aspect-square h-11 text-lg font-semibold text-slate-700 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className="aspect-square h-11 text-lg font-semibold text-slate-700 transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
                      disableAddToCart ? 'cursor-not-allowed opacity-60' : 'hover:bg-primary-dark'
                    )}
                    onClick={handleAddToCart}
                    disabled={disableAddToCart}
                  >
                    {disableAddToCart ? 'Currently unavailable' : 'Add to cart'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted">
                  {availableQuantity !== null && Number.isFinite(availableQuantity) ? (
                    <span>
                      {allowBackorder
                        ? `Backorder available. ${availableQuantity} unit${availableQuantity === 1 ? '' : 's'} in next allocation.`
                        : `${availableQuantity} unit${availableQuantity === 1 ? '' : 's'} available.`}
                    </span>
                  ) : allowBackorder ? (
                    <span>Backorder allowed; ships as soon as stock is replenished.</span>
                  ) : null}
                  {activeVariation && (activeVariation.attributes || activeVariation.name) ? (
                    <span className="font-medium text-slate-700">
                      Selected: {variationLabel(activeVariation, 0)}
                    </span>
                  ) : null}
                  {product.support?.returnPolicy ? (
                    <span>Returns: {product.support.returnPolicy}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                <button
                  type="button"
                  onClick={() => window?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Check fitment
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleWishlist()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  <Heart className={cn('h-4 w-4', isInWishlist ? 'text-rose-500' : 'text-slate-500')} />
                  {isInWishlist ? 'Saved to wishlist' : 'Add to wishlist'}
                </button>
              </div>

              <dl className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-xs text-muted">
                {product.sku ? (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">SKU</dt>
                    <dd className="font-semibold text-slate-900">{product.sku}</dd>
                  </div>
                ) : null}
                {product.productCode ? (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Product code</dt>
                    <dd className="font-semibold text-slate-900">{product.productCode}</dd>
                  </div>
                ) : null}
                {manufacturer ? (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Manufacturer</dt>
                    <dd>
                      <Link
                        to={`/manufacturers/${manufacturer.slug}`}
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {manufacturer.name}
                      </Link>
                    </dd>
                  </div>
                ) : product.manufacturerName ? (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Manufacturer</dt>
                    <dd className="font-semibold text-slate-900">{product.manufacturerName}</dd>
                  </div>
                ) : null}
                {categoryTrail.length ? (
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Category</dt>
                    <dd className="flex flex-wrap justify-end gap-1 text-right">
                      {categoryTrail.map((category) => (
                        <Link
                          key={category.id}
                          to={`/categories/${category.id}`}
                          className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {product.tags.length ? (
                  <div className="flex items-start justify-between">
                    <dt className="mt-1 font-medium text-slate-600">Tags</dt>
                    <dd className="flex flex-wrap justify-end gap-1">
                      {product.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {compatibilityMakes?.length ? (
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-xs text-primary">
                  Verified fitment for {compatibilityMakes.length} make{compatibilityMakes.length === 1 ? '' : 's'} including{' '}
                  <span className="font-semibold">
                    {compatibilityMakes.slice(0, 3).join(', ')}
                    {compatibilityMakes.length > 3 ? '…' : ''}
                  </span>
                  . Use the compatibility tools below to confirm your vehicle.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <button
                  type="button"
                  onClick={handleReportIncorrectInfo}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Report incorrect product information
                </button>
                {product.support?.liveChatUrl ? (
                  <a
                    href={product.support.liveChatUrl}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Live chat with a specialist
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <ProductDetailTabs
            productId={product.id}
            description={product.description}
            featureHighlights={product.featureHighlights}
            packageContents={product.packageContents}
            specifications={product.specifications}
            attributes={product.attributes ?? null}
            customAttributes={product.customAttributes ?? null}
            compatibility={product.compatibility}
            documents={product.documents}
            videoUrls={product.videoUrls}
            reviewsSummary={product.reviewsSummary ?? null}
            support={product.support ?? null}
            shipping={product.shipping ?? null}
            notes={product.notes ?? null}
            seo={product.seo ?? null}
          />

          <section className="rounded-3xl bg-slate-900 p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-white">Free Shipping</h4>
                  <p className="text-xs text-slate-400">Free Express Shipping</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-white">Money Guarantee</h4>
                  <p className="text-xs text-slate-400">Within our Refund Policy</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800">
                    <Headphones className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-white">Online Support</h4>
                  <p className="text-xs text-slate-400">After-Sales technical support service</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-white">Flexible Payment</h4>
                  <p className="text-xs text-slate-400">Multiple Secured Payment Methods</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-12">
            <ProductRecommendationRail
              title="Frequently bought together"
              subtitle="Complementary tools and accessories that pair well with this product."
              products={upsellProducts}
            />
            <ProductRecommendationRail
              title="Recommended alternatives"
              subtitle="Explore related parts that fit similar vehicles or configurations."
              products={relatedProducts}
            />
            <ProductRecommendationRail
              title="You might also like"
              subtitle="Cross-sell suggestions based on similar shopping journeys."
              products={crossSellProducts}
            />
          </div>
        </article>
        )}
      </div>
    </SiteLayout>
  );
};
