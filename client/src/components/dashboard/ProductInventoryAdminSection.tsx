import { useEffect, useMemo, useState } from 'react';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { RefreshCw, X } from 'lucide-react';

type StatusSetter = (msg: string | null, err?: string | null) => void;

type StockFilter = 'all' | 'out_of_stock' | 'low_stock' | 'in_stock' | 'backorder' | 'preorder';

type BadgeFilter =
  | 'all'
  | 'backorder'
  | 'preorder'
  | 'featured'
  | 'new_arrival'
  | 'on_sale'
  | 'back_in_stock'
  | 'hidden';

type InventoryBadgeOverride = '' | 'out_of_stock' | 'preorder';

type ProductInventoryEditState = {
  quantity: string;
  replenishBy: string;
  lowStockThreshold: string;
  allowBackorder: boolean;
  featured: boolean;
  newArrival: boolean;
  visibility: NonNullable<Product['visibility']> | 'hidden';
  inventoryBadgeOverride: InventoryBadgeOverride;
  price: string;
  saleType: 'percentage' | 'price';
  salePercentage: string;
  salePrice: string;
  saleStartDate: string;
  saleEndDate: string;
};

const toDateLocal = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const DEFAULT_VISIBILITY: NonNullable<Product['visibility']> = 'catalog-and-search';

const getDefaultEditState = (product: Product): ProductInventoryEditState => ({
  quantity: String(product.inventory?.quantity ?? 0),
  replenishBy: '',
  lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 0),
  allowBackorder: Boolean(product.inventory?.allowBackorder),
  featured: Boolean(product.featured),
  newArrival: Boolean(product.newArrival),
  visibility: (product.visibility ?? DEFAULT_VISIBILITY) as NonNullable<Product['visibility']>,
  inventoryBadgeOverride:
    product.inventory?.status === 'out_of_stock'
      ? 'out_of_stock'
      : product.inventory?.status === 'preorder'
        ? 'preorder'
        : '',
  price: typeof product.price === 'number' ? String(product.price) : '',
  saleType: 'price',
  salePercentage:
    typeof product.salePrice === 'number' &&
    typeof product.price === 'number' &&
    product.price > 0 &&
    product.salePrice < product.price
      ? String(Math.round((1 - product.salePrice / product.price) * 1000) / 10)
      : '',
  salePrice: product.salePrice != null ? String(product.salePrice) : '',
  saleStartDate: toDateLocal(product.saleStartDate ?? null),
  saleEndDate: toDateLocal(product.saleEndDate ?? null),
});

type EffectiveInventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';

const getEffectiveInventoryStatus = (product: Product): EffectiveInventoryStatus => {
  const status = (product.inventory?.status ?? 'in_stock') as EffectiveInventoryStatus;
  const allowBackorder = Boolean(product.inventory?.allowBackorder);
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  const lowStockThreshold =
    typeof product.inventory?.lowStockThreshold === 'number' ? product.inventory.lowStockThreshold : 0;

  if (status === 'preorder') {
    return 'preorder';
  }

  if (status === 'backorder' && quantity <= 0) {
    return 'backorder';
  }

  if (allowBackorder && quantity <= 0) {
    return 'backorder';
  }

  if (status === 'out_of_stock' || quantity <= 0) {
    return 'out_of_stock';
  }

  if (status === 'low_stock' || (lowStockThreshold > 0 && quantity <= lowStockThreshold)) {
    return 'low_stock';
  }

  return 'in_stock';
};

const statusRank = (product: Product) => {
  const status = getEffectiveInventoryStatus(product);
  if (status === 'out_of_stock') return 0;
  if (status === 'low_stock') return 1;
  if (status === 'backorder') return 2;
  if (status === 'preorder') return 3;
  return 4;
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

interface ProductInventoryAdminSectionProps {
  products: Product[];
  onRefresh: () => Promise<void>;
  setStatus: StatusSetter;
  onOpenProduct: (id: string) => void;
}

export const ProductInventoryAdminSection: React.FC<ProductInventoryAdminSectionProps> = ({
  products,
  onRefresh,
  setStatus,
  onOpenProduct,
}) => {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [edits, setEdits] = useState<Record<string, ProductInventoryEditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [activeReplenishId, setActiveReplenishId] = useState<string | null>(null);
  const [selectedHiddenIds, setSelectedHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEdits((current) => {
      const next: Record<string, ProductInventoryEditState> = { ...current };
      products.forEach((product) => {
        if (next[product.id]) return;
        next[product.id] = getDefaultEditState(product);
      });
      return next;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = (product: Product) => {
      if (!normalizedSearch) return true;
      const haystack = [
        product.name,
        product.sku,
        product.productCode,
        product.manufacturerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    };

    const matchesStock = (product: Product) => {
      if (stockFilter === 'all') return true;

      if (stockFilter === 'backorder') {
        return Boolean(product.inventory?.allowBackorder) && product.inventory?.status !== 'preorder';
      }

      if (stockFilter === 'preorder') {
        return product.inventory?.status === 'preorder';
      }

      return getEffectiveInventoryStatus(product) === stockFilter;
    };

    const matchesBadge = (product: Product) => {
      if (badgeFilter === 'all') return true;

      if (badgeFilter === 'backorder') {
        return Boolean(product.inventory?.allowBackorder) && product.inventory?.status !== 'preorder';
      }

      if (badgeFilter === 'preorder') {
        return product.inventory?.status === 'preorder';
      }

      if (badgeFilter === 'featured') {
        return Boolean(product.featured);
      }

      if (badgeFilter === 'new_arrival') {
        return Boolean(product.newArrival);
      }

      if (badgeFilter === 'on_sale') {
        return isSaleActive(product);
      }

      if (badgeFilter === 'back_in_stock') {
        return Boolean(product.restockedAt);
      }

      return product.visibility === 'hidden';
    };

    return [...products]
      .filter(matchesSearch)
      .filter(matchesStock)
      .filter(matchesBadge)
      .sort((a, b) => {
        const rankDiff = statusRank(a) - statusRank(b);
        if (rankDiff !== 0) return rankDiff;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [products, search, stockFilter, badgeFilter]);

  const hasActiveFilters = stockFilter !== 'all' || badgeFilter !== 'all';
  const hiddenFilterActive = badgeFilter === 'hidden';

  useEffect(() => {
    if (!hiddenFilterActive) {
      setSelectedHiddenIds(new Set());
      return;
    }
    const visibleIds = new Set(filteredProducts.map((product) => product.id));
    setSelectedHiddenIds((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [hiddenFilterActive, filteredProducts]);

  const hasEdits = (product: Product) => {
    const edit = edits[product.id];
    if (!edit) return false;

    const quantity = product.inventory?.quantity ?? 0;
    const lowStockThreshold = product.inventory?.lowStockThreshold ?? 0;
    const allowBackorder = Boolean(product.inventory?.allowBackorder);
    const featured = Boolean(product.featured);
    const newArrival = Boolean(product.newArrival);
    const visibility = (product.visibility ?? DEFAULT_VISIBILITY) as NonNullable<Product['visibility']>;
    const inventoryBadgeOverride =
      product.inventory?.status === 'out_of_stock'
        ? 'out_of_stock'
        : product.inventory?.status === 'preorder'
          ? 'preorder'
          : '';
    const price = typeof product.price === 'number' ? product.price : 0;
    const salePrice = product.salePrice ?? null;
    const saleStartDate = toDateLocal(product.saleStartDate ?? null);
    const saleEndDate = toDateLocal(product.saleEndDate ?? null);

    const nextQuantity = Number.parseInt(edit.quantity, 10);
    const nextLowStock = Number.parseInt(edit.lowStockThreshold, 10);
    const nextPrice = Number.parseFloat(edit.price);
    const basePrice = Number.isFinite(nextPrice) ? nextPrice : price;

    let nextSalePrice: number | null = null;
    if (edit.saleType === 'percentage') {
      const percentRaw = edit.salePercentage.trim();
      if (percentRaw) {
        const percent = Number.parseFloat(percentRaw);
        if (Number.isFinite(percent) && percent > 0 && percent < 100 && basePrice > 0) {
          nextSalePrice = Math.round(basePrice * (1 - percent / 100) * 100) / 100;
        }
      }
    } else {
      const salePriceRaw = edit.salePrice.trim();
      if (salePriceRaw) {
        const parsed = Number.parseFloat(salePriceRaw);
        if (Number.isFinite(parsed)) {
          nextSalePrice = parsed;
        }
      }
    }

    return (
      (Number.isFinite(nextQuantity) ? nextQuantity !== quantity : edit.quantity.trim() !== String(quantity)) ||
      (Number.isFinite(nextLowStock)
        ? nextLowStock !== lowStockThreshold
        : edit.lowStockThreshold.trim() !== String(lowStockThreshold)) ||
      edit.allowBackorder !== allowBackorder ||
      edit.featured !== featured ||
      edit.newArrival !== newArrival ||
      edit.visibility !== visibility ||
      edit.inventoryBadgeOverride !== inventoryBadgeOverride ||
      (Number.isFinite(nextPrice) ? nextPrice !== price : edit.price.trim() !== String(price)) ||
      nextSalePrice !== salePrice ||
      edit.saleStartDate !== saleStartDate ||
      edit.saleEndDate !== saleEndDate
    );
  };

  const hasBulkEdits = useMemo(
    () => filteredProducts.some((product) => hasEdits(product)),
    [filteredProducts, edits]
  );

  const updateFieldForProduct = <K extends keyof ProductInventoryEditState>(
    product: Product,
    key: K,
    value: ProductInventoryEditState[K]
  ) => {
    setEdits((current) => ({
      ...current,
      [product.id]: { ...(current[product.id] ?? getDefaultEditState(product)), [key]: value },
    }));
  };

  const toggleHidden = async (product: Product) => {
    const nextVisibility: NonNullable<Product['visibility']> =
      product.visibility === 'hidden' ? DEFAULT_VISIBILITY : 'hidden';

    updateFieldForProduct(product, 'visibility', nextVisibility);
    setSavingId(product.id);
    try {
      await productsApi.update(product.id, { visibility: nextVisibility });
      await onRefresh();
      setStatus(nextVisibility === 'hidden' ? 'Product hidden' : 'Product visible');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to update product visibility');
    } finally {
      setSavingId(null);
    }
  };

  const buildInventoryUpdate = (product: Product, edit: ProductInventoryEditState) => {
    const quantity = Number.parseInt(edit.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return { error: 'Stock quantity must be a number (0 or higher).' };
    }

    const lowStockThreshold = Number.parseInt(edit.lowStockThreshold, 10);
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      return { error: 'Low-stock threshold must be a number (0 or higher).' };
    }

    const price = Number.parseFloat(edit.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: 'Price must be a number (0 or higher).' };
    }

    let salePrice: number | null = null;
    if (edit.saleType === 'percentage') {
      const percentRaw = edit.salePercentage.trim();
      if (percentRaw) {
        const percent = Number.parseFloat(percentRaw);
        if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
          return { error: 'Sale percentage must be between 0 and 100.' };
        }
        if (price <= 0) {
          return { error: 'Price must be set before applying a percentage sale.' };
        }
        salePrice = Math.round(price * (1 - percent / 100) * 100) / 100;
      }
    } else {
      const salePriceRaw = edit.salePrice.trim();
      if (salePriceRaw) {
        const parsed = Number.parseFloat(salePriceRaw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return { error: 'Sale price must be a number (0 or higher).' };
        }
        salePrice = parsed;
      }
    }

    if (salePrice != null && salePrice > price) {
      return { error: 'Sale must be less than (or equal to) the regular price.' };
    }

    const parseDateOnlyLocal = (value: string, endOfDay = false): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parts = trimmed.split('-').map((part) => Number(part));
      if (parts.length !== 3) return null;
      const [year, month, day] = parts;
      if (!year || !month || !day) return null;
      const parsed = endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59, 999)
        : new Date(year, month - 1, day, 0, 0, 0, 0);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString();
    };

    const saleStartDate = parseDateOnlyLocal(edit.saleStartDate, false);
    const saleEndDate = parseDateOnlyLocal(edit.saleEndDate, true);
    if (edit.saleStartDate.trim() && !saleStartDate) {
      return { error: 'Sale start date is invalid.' };
    }
    if (edit.saleEndDate.trim() && !saleEndDate) {
      return { error: 'Sale end date is invalid.' };
    }

    const baseInventory = product.inventory ?? {
      quantity: 0,
      lowStockThreshold: 0,
      status: 'in_stock',
      allowBackorder: false,
      leadTime: '',
    };

    const inventoryStatusOverride =
      edit.inventoryBadgeOverride === 'out_of_stock'
        ? 'out_of_stock'
        : edit.inventoryBadgeOverride === 'preorder'
          ? 'preorder'
          : undefined;
    const allowBackorder =
      edit.inventoryBadgeOverride === 'out_of_stock'
        ? false
        : edit.inventoryBadgeOverride === 'preorder'
          ? true
          : edit.allowBackorder;

    return {
      payload: {
        price,
        salePrice,
        saleStartDate,
        saleEndDate,
        featured: edit.featured,
        newArrival: edit.newArrival,
        visibility: edit.visibility ?? DEFAULT_VISIBILITY,
        inventory: {
          ...baseInventory,
          quantity,
          lowStockThreshold,
          allowBackorder,
          status: inventoryStatusOverride,
        },
      },
    };
  };

  const saveProduct = async (product: Product) => {
    const edit = edits[product.id] ?? getDefaultEditState(product);
    const result = buildInventoryUpdate(product, edit);
    if ('error' in result) {
      setStatus(null, result.error);
      return;
    }

    setSavingId(product.id);
    try {
      await productsApi.update(product.id, result.payload);
      await onRefresh();
      setStatus('Inventory updated');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to update inventory');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    const targets = filteredProducts.filter((product) => hasEdits(product));
    if (targets.length === 0) {
      setStatus('No changes to save');
      return;
    }
    setBulkSaving(true);
    try {
      for (const product of targets) {
        const edit = edits[product.id] ?? getDefaultEditState(product);
        const result = buildInventoryUpdate(product, edit);
        if ('error' in result) {
          setStatus(null, result.error);
          return;
        }
        setSavingId(product.id);
        await productsApi.update(product.id, result.payload);
      }
      await onRefresh();
      setStatus('Inventory updated');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to update inventory');
    } finally {
      setSavingId(null);
      setBulkSaving(false);
    }
  };

  const handleUnhideAll = async () => {
    const targets =
      selectedHiddenIds.size > 0
        ? filteredProducts.filter((product) => selectedHiddenIds.has(product.id))
        : filteredProducts;
    if (targets.length === 0) return;

    setBulkSaving(true);
    setEdits((current) => {
      const next = { ...current };
      targets.forEach((product) => {
        next[product.id] = {
          ...(next[product.id] ?? getDefaultEditState(product)),
          visibility: DEFAULT_VISIBILITY,
        };
      });
      return next;
    });

    try {
      for (const product of targets) {
        setSavingId(product.id);
        await productsApi.update(product.id, { visibility: DEFAULT_VISIBILITY });
      }
      await onRefresh();
      setStatus(targets.length === 1 ? 'Product visible' : 'Products visible');
      setSelectedHiddenIds(new Set());
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to update product visibility');
    } finally {
      setSavingId(null);
      setBulkSaving(false);
    }
  };

  const handleRefresh = async () => {
    setSearch('');
    setStockFilter('all');
    setBadgeFilter('all');
    setActiveReplenishId(null);
    setSelectedHiddenIds(new Set());
    try {
      await onRefresh();
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to refresh inventory');
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, SKU, code..."
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-72"
          />
          <div className="w-full sm:w-60">
            <Select
              value={stockFilter}
              onChange={(value) => setStockFilter(value as StockFilter)}
              options={[
                { value: 'all', label: 'All stock statuses' },
                { value: 'out_of_stock', label: 'Out of stock' },
                { value: 'low_stock', label: 'Low stock' },
                { value: 'in_stock', label: 'In stock' },
                { value: 'backorder', label: 'Backorder' },
                { value: 'preorder', label: 'Preorder' },
              ]}
              placeholder="Filter by stock"
            />
          </div>
          <div className="w-full sm:w-60">
            <Select
              value={badgeFilter}
              onChange={(value) => setBadgeFilter(value as BadgeFilter)}
              options={[
                { value: 'all', label: 'All badges' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'featured', label: 'Featured' },
                { value: 'new_arrival', label: 'New arrival' },
                { value: 'on_sale', label: 'On sale' },
                { value: 'back_in_stock', label: 'Back in stock' },
                { value: 'backorder', label: 'Backorder' },
                { value: 'preorder', label: 'Preorder' },
              ]}
              placeholder="Filter by badge"
            />
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={bulkSaving || !hasBulkEdits}
              className={cn(
                'h-11 rounded-xl px-4 text-sm font-semibold text-white transition',
                bulkSaving || !hasBulkEdits
                  ? 'cursor-not-allowed bg-rose-200 text-white/80'
                  : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              Save all
            </button>
          )}
          {hiddenFilterActive && (
            <button
              type="button"
              onClick={() => void handleUnhideAll()}
              disabled={bulkSaving || filteredProducts.length === 0}
              className={cn(
                'h-11 rounded-xl border px-4 text-sm font-semibold transition',
                bulkSaving || filteredProducts.length === 0
                  ? 'cursor-not-allowed border-rose-200 bg-rose-50 text-rose-300'
                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              )}
            >
              Unhide all
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {!filteredProducts.length ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
            No products match the current filters.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden px-2 py-2">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-2 py-3 text-left font-semibold w-[18%]">Product</th>
                  <th className="px-2 py-3 text-left font-semibold w-[10%]">Qty</th>
                  <th className="px-2 py-3 text-left font-semibold w-[6%]">Low stock</th>
                  <th className="px-2 py-3 text-left font-semibold w-[6%]">Price</th>
                  <th className="px-2 py-3 text-left font-semibold w-[10%]">Sale</th>
                  <th className="px-2 py-3 text-left font-semibold w-[18%]">Sales period</th>
                  <th className="px-2 py-3 text-left font-semibold w-[10%]">Badges</th>
                  <th className="px-2 py-3 text-right font-semibold w-[5%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const edit = edits[product.id] ?? getDefaultEditState(product);
                  const status = getEffectiveInventoryStatus(product);
                  const outOfStock = status === 'out_of_stock';
                  const statusLabel = status.replace(/_/g, ' ');
                  const saleActive = isSaleActive(product);
                  const showBackInStock = Boolean(product.restockedAt);
                  const showFeatured = Boolean(product.featured);
                  const showNewArrival = Boolean(product.newArrival);
                  const showHidden = product.visibility === 'hidden';
                  const showBackorderBadge = Boolean(product.inventory?.allowBackorder) && status !== 'preorder';
                  const rowHasEdits = hasEdits(product);
                  const isSaving = savingId === product.id;
                  const isHiddenSelected = selectedHiddenIds.has(product.id);
                  const currentQuantity = product.inventory?.quantity ?? 0;
                  const parsedNextQuantity = Number.parseInt(edit.quantity, 10);
                  const hasPendingQuantity =
                    Number.isFinite(parsedNextQuantity) && parsedNextQuantity >= 0 && parsedNextQuantity !== currentQuantity;
                  const displayQuantity = hasPendingQuantity ? parsedNextQuantity : currentQuantity;
                  const parsedThreshold = Number.parseInt(edit.lowStockThreshold, 10);
                  const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : product.inventory?.lowStockThreshold ?? 0;
                  const doubleThreshold = threshold * 2;
                  const quantityTone =
                    threshold <= 0
                      ? currentQuantity <= 0
                        ? 'red'
                        : 'green'
                      : currentQuantity <= threshold
                        ? 'red'
                        : currentQuantity < doubleThreshold
                          ? 'yellow'
                          : 'green';
                  const quantityPillClass =
                    quantityTone === 'red'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : quantityTone === 'yellow'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700';
                  const displayQuantityPillClass = hasPendingQuantity ? 'border-amber-200 bg-amber-50 text-amber-800' : quantityPillClass;

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'transition-colors',
                        outOfStock ? 'bg-rose-50/40' : 'hover:bg-slate-50'
                      )}
                    >
                      <td className="px-2 py-3 align-top min-w-0">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-3">
                            {hiddenFilterActive && (
                              <label className="mt-1 flex h-5 w-5 items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isHiddenSelected}
                                  onChange={(event) => {
                                    const checked = event.target.checked;
                                    setSelectedHiddenIds((current) => {
                                      const next = new Set(current);
                                      if (checked) {
                                        next.add(product.id);
                                      } else {
                                        next.delete(product.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30"
                                  aria-label="Select product to unhide"
                                />
                              </label>
                            )}
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              <img
                                src={product.images?.[0] ?? 'https://placehold.co/80x80?text=Product'}
                                alt={product.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenProduct(product.id)}
                                className="block text-left font-semibold text-slate-900 transition hover:text-primary"
                              >
                                {product.name}
                              </button>
                              {product.sku ? (
                                <div className="mt-1 text-xs text-slate-600">
                                  <span className="block max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-center">
                                    SKU: {product.sku}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold capitalize',
                                status === 'out_of_stock'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : status === 'low_stock'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : status === 'backorder'
                                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                      : status === 'preorder'
                                        ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              )}
                            >
                              {statusLabel}
                            </span>
                            {showBackorderBadge ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[0.7rem] font-semibold text-indigo-700">
                                Backorder
                              </span>
                            ) : null}
                            {saleActive ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[0.7rem] font-semibold text-rose-700">
                                On sale
                              </span>
                            ) : null}
                            {showBackInStock ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[0.7rem] font-semibold text-sky-700">
                                Back in stock
                              </span>
                            ) : null}
                            {showFeatured ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-800">
                                Featured
                              </span>
                            ) : null}
                            {showNewArrival ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[0.7rem] font-semibold text-orange-800">
                                New arrival
                              </span>
                            ) : null}
                            {showHidden ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-700">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="relative group">
                              <span
                                className={cn(
                                  'inline-flex h-9 min-w-14 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors',
                                  displayQuantityPillClass
                                )}
                              >
                                {displayQuantity}
                              </span>
                              {hasPendingQuantity ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    updateFieldForProduct(product, 'quantity', String(currentQuantity));
                                  }}
                                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:text-rose-700 group-hover:flex"
                                  aria-label="Cancel quantity change"
                                  title="Cancel quantity change"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplenishId((current) => (current === product.id ? null : product.id));
                                updateFieldForProduct(product, 'replenishBy', '');
                              }}
                              className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                              aria-label="Replenish stock"
                            >
                              +
                            </button>
                          </div>

                          {activeReplenishId === product.id ? (
                            <div className="flex flex-col items-start gap-2">
                              <input
                                type="number"
                                min={0}
                                value={edit.replenishBy}
                                onChange={(event) => updateFieldForProduct(product, 'replenishBy', event.target.value)}
                                placeholder="Add"
                                className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const amount = Number.parseInt(edit.replenishBy, 10);
                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    setStatus(null, 'Replenish amount must be greater than 0.');
                                    return;
                                  }
                                  updateFieldForProduct(product, 'quantity', String(currentQuantity + amount));
                                  updateFieldForProduct(product, 'replenishBy', '');
                                  setActiveReplenishId(null);
                                }}
                                className="h-9 w-20 self-center rounded-lg border border-primary bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary/90"
                              >
                                Add
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          value={edit.lowStockThreshold}
                          onChange={(event) => updateFieldForProduct(product, 'lowStockThreshold', event.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-2 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={edit.price}
                          onChange={(event) => updateFieldForProduct(product, 'price', event.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={edit.saleType}
                            onChange={(event) => updateFieldForProduct(product, 'saleType', event.target.value as ProductInventoryEditState['saleType'])}
                            className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="percentage">%</option>
                            <option value="price">Price</option>
                          </select>
                          {edit.saleType === 'percentage' ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              value={edit.salePercentage}
                              onChange={(event) => updateFieldForProduct(product, 'salePercentage', event.target.value)}
                              placeholder="%"
                              className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={edit.salePrice}
                              onChange={(event) => updateFieldForProduct(product, 'salePrice', event.target.value)}
                              placeholder="—"
                              className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          )}
                          {(() => {
                            const nextBasePrice = Number.parseFloat(edit.price);
                            const basePrice = Number.isFinite(nextBasePrice) ? nextBasePrice : product.price;
                            if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

                            if (edit.saleType === 'percentage') {
                              const percent = Number.parseFloat(edit.salePercentage);
                              if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
                              const savings = (basePrice * percent) / 100;
                              if (savings <= 0) return null;
                              return (
                                <p className="text-[0.7rem] font-semibold text-rose-600">
                                  Save {formatCurrency(savings)}
                                </p>
                              );
                            }

                            const sale = Number.parseFloat(edit.salePrice);
                            if (!Number.isFinite(sale) || sale < 0 || sale >= basePrice) return null;
                            const savings = basePrice - sale;
                            if (savings <= 0) return null;
                            const percent = (savings / basePrice) * 100;
                            const percentDisplay = Number.isFinite(percent) ? Math.round(percent) : null;
                            return (
                              <p className="text-[0.7rem] font-semibold text-rose-600">
                                Save {formatCurrency(savings)}
                                {percentDisplay != null ? ` - ${percentDisplay}%` : null}
                              </p>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <span className="w-8 text-[0.7rem] font-semibold text-slate-500">Start</span>
                            <DatePicker
                              value={edit.saleStartDate}
                              onChange={(next) => updateFieldForProduct(product, 'saleStartDate', next)}
                              className="min-w-0 flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-8 text-[0.7rem] font-semibold text-slate-500">End</span>
                            <DatePicker
                              value={edit.saleEndDate}
                              onChange={(next) => updateFieldForProduct(product, 'saleEndDate', next)}
                              className="min-w-0 flex-1"
                            />
                          </div>
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  disabled={
                                    !(() => {
                                  const nextBasePrice = Number.parseFloat(edit.price);
                                  const basePrice = Number.isFinite(nextBasePrice) ? nextBasePrice : product.price;
                                  const hasSaleDates = Boolean(edit.saleStartDate.trim() || edit.saleEndDate.trim());

                                  if (edit.saleType === 'percentage') {
                                    const percent = Number.parseFloat(edit.salePercentage);
                                    return (
                                      hasSaleDates ||
                                      (Number.isFinite(percent) && percent > 0 && percent < 100 && basePrice > 0)
                                    );
                                  }

                                  const parsed = Number.parseFloat(edit.salePrice);
                                  return hasSaleDates || (Number.isFinite(parsed) && parsed < basePrice);
                                })()
                              }
                              onClick={() => {
                                const nextBasePrice = Number.parseFloat(edit.price);
                                const basePrice = Number.isFinite(nextBasePrice) ? nextBasePrice : product.price;
                                updateFieldForProduct(product, 'saleType', 'price');
                                updateFieldForProduct(product, 'salePercentage', '');
                                updateFieldForProduct(product, 'salePrice', String(basePrice));
                                updateFieldForProduct(product, 'saleStartDate', '');
                                updateFieldForProduct(product, 'saleEndDate', '');
                              }}
                              className={cn(
                                'h-8 whitespace-nowrap rounded-lg border px-2 text-[0.7rem] font-semibold transition',
                                (() => {
                                  const nextBasePrice = Number.parseFloat(edit.price);
                                  const basePrice = Number.isFinite(nextBasePrice) ? nextBasePrice : product.price;
                                  const hasSaleDates = Boolean(edit.saleStartDate.trim() || edit.saleEndDate.trim());

                                  if (edit.saleType === 'percentage') {
                                    const percent = Number.parseFloat(edit.salePercentage);
                                    const hasSale =
                                      hasSaleDates ||
                                      (Number.isFinite(percent) && percent > 0 && percent < 100 && basePrice > 0);
                                    return hasSale
                                      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
                                  }

                                  const parsed = Number.parseFloat(edit.salePrice);
                                  const hasSale = hasSaleDates || (Number.isFinite(parsed) && parsed < basePrice);
                                  return hasSale
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
                                })()
                              )}
                            >
                              {(() => {
                                const nextBasePrice = Number.parseFloat(edit.price);
                                const basePrice = Number.isFinite(nextBasePrice) ? nextBasePrice : product.price;
                                const hasSaleDates = Boolean(edit.saleStartDate.trim() || edit.saleEndDate.trim());

                                if (edit.saleType === 'percentage') {
                                  const percent = Number.parseFloat(edit.salePercentage);
                                  const hasSale =
                                    hasSaleDates ||
                                    (Number.isFinite(percent) && percent > 0 && percent < 100 && basePrice > 0);
                                  return hasSale ? 'Remove sale' : 'No sale';
                                }

                                const parsed = Number.parseFloat(edit.salePrice);
                                const hasSale = hasSaleDates || (Number.isFinite(parsed) && parsed < basePrice);
                                return hasSale ? 'Remove sale' : 'No sale';
                              })()}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-col gap-1.5 text-xs text-slate-700">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={edit.inventoryBadgeOverride === 'preorder' ? true : edit.allowBackorder}
                              disabled={edit.inventoryBadgeOverride === 'out_of_stock' || edit.inventoryBadgeOverride === 'preorder'}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateFieldForProduct(product, 'allowBackorder', checked);
                                if (checked && edit.inventoryBadgeOverride === 'out_of_stock') {
                                  updateFieldForProduct(product, 'inventoryBadgeOverride', '');
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 disabled:opacity-40"
                            />
                            <span className="font-medium">Backorder</span>
                          </label>

                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={edit.featured}
                              onChange={(event) => updateFieldForProduct(product, 'featured', event.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                            />
                            <span className="font-medium">Featured</span>
                          </label>

                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={edit.newArrival}
                              onChange={(event) => updateFieldForProduct(product, 'newArrival', event.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                            />
                            <span className="font-medium">New arrival</span>
                          </label>

                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={edit.inventoryBadgeOverride === 'out_of_stock'}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateFieldForProduct(product, 'inventoryBadgeOverride', checked ? 'out_of_stock' : '');
                                if (checked) {
                                  updateFieldForProduct(product, 'allowBackorder', false);
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                            />
                            <span className="font-medium">Out of stock</span>
                          </label>

                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={edit.inventoryBadgeOverride === 'preorder'}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateFieldForProduct(product, 'inventoryBadgeOverride', checked ? 'preorder' : '');
                                if (checked) {
                                  updateFieldForProduct(product, 'allowBackorder', true);
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                            />
                            <span className="font-medium">Preorder</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle text-right">
                        <div className="flex h-full flex-col items-end justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void toggleHidden(product)}
                            className={cn(
                              'h-9 whitespace-nowrap rounded-lg border px-2 text-xs font-semibold transition ',
                              product.visibility === 'hidden'
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                                : 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200'
                            )}
                          >
                            {product.visibility === 'hidden' ? 'Unhide' : 'Hide'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProduct(product.id)}
                            className="h-9 whitespace-nowrap rounded-lg border border-border bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                          >
                            Edit details
                          </button>
                          <button
                            type="button"
                            disabled={!rowHasEdits || isSaving}
                            onClick={() => void saveProduct(product)}
                            className={cn(
                              'h-9 rounded-lg px-2 text-xs font-semibold transition',
                              !rowHasEdits || isSaving
                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                : 'border border-primary bg-primary text-white hover:bg-primary/90'
                            )}
                          >
                            {isSaving ? 'Saving...' : rowHasEdits ? 'Save' : 'Saved'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
