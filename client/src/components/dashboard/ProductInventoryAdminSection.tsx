import { useEffect, useMemo, useState } from 'react';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { cn } from '../../utils/cn';
import { Select } from '../ui/Select';

type StatusSetter = (msg: string | null, err?: string | null) => void;

type StockFilter = 'all' | 'out_of_stock' | 'low_stock' | 'in_stock' | 'backorder' | 'preorder';

type ProductInventoryEditState = {
  quantity: string;
  replenishBy: string;
  lowStockThreshold: string;
  allowBackorder: boolean;
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

const getDefaultEditState = (product: Product): ProductInventoryEditState => ({
  quantity: String(product.inventory?.quantity ?? 0),
  replenishBy: '',
  lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 0),
  allowBackorder: Boolean(product.inventory?.allowBackorder),
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

const isOutOfStock = (product: Product) => {
  const status = product.inventory?.status ?? 'in_stock';
  const allowBackorder = product.inventory?.allowBackorder ?? false;
  const quantity = product.inventory?.quantity ?? 0;
  return status === 'out_of_stock' || (!allowBackorder && quantity <= 0);
};

const statusRank = (product: Product) => {
  if (isOutOfStock(product)) return 0;
  const status = product.inventory?.status ?? 'in_stock';
  if (status === 'low_stock') return 1;
  if (status === 'backorder') return 2;
  if (status === 'preorder') return 3;
  return 4;
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
  const [edits, setEdits] = useState<Record<string, ProductInventoryEditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeReplenishId, setActiveReplenishId] = useState<string | null>(null);

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
      if (stockFilter === 'out_of_stock') return isOutOfStock(product);
      return (product.inventory?.status ?? 'in_stock') === stockFilter;
    };

    return [...products]
      .filter(matchesSearch)
      .filter(matchesStock)
      .sort((a, b) => {
        const rankDiff = statusRank(a) - statusRank(b);
        if (rankDiff !== 0) return rankDiff;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [products, search, stockFilter]);

  const hasEdits = (product: Product) => {
    const edit = edits[product.id];
    if (!edit) return false;

    const quantity = product.inventory?.quantity ?? 0;
    const lowStockThreshold = product.inventory?.lowStockThreshold ?? 0;
    const allowBackorder = Boolean(product.inventory?.allowBackorder);
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
      (Number.isFinite(nextPrice) ? nextPrice !== price : edit.price.trim() !== String(price)) ||
      nextSalePrice !== salePrice ||
      edit.saleStartDate !== saleStartDate ||
      edit.saleEndDate !== saleEndDate
    );
  };

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

  const saveProduct = async (product: Product) => {
    const edit = edits[product.id] ?? getDefaultEditState(product);

    const quantity = Number.parseInt(edit.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setStatus(null, 'Stock quantity must be a number (0 or higher).');
      return;
    }

    const lowStockThreshold = Number.parseInt(edit.lowStockThreshold, 10);
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      setStatus(null, 'Low-stock threshold must be a number (0 or higher).');
      return;
    }

    const price = Number.parseFloat(edit.price);
    if (!Number.isFinite(price) || price < 0) {
      setStatus(null, 'Price must be a number (0 or higher).');
      return;
    }

    let salePrice: number | null = null;
    if (edit.saleType === 'percentage') {
      const percentRaw = edit.salePercentage.trim();
      if (percentRaw) {
        const percent = Number.parseFloat(percentRaw);
        if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
          setStatus(null, 'Sale percentage must be between 0 and 100.');
          return;
        }
        if (price <= 0) {
          setStatus(null, 'Price must be set before applying a percentage sale.');
          return;
        }
        salePrice = Math.round(price * (1 - percent / 100) * 100) / 100;
      }
    } else {
      const salePriceRaw = edit.salePrice.trim();
      if (salePriceRaw) {
        const parsed = Number.parseFloat(salePriceRaw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setStatus(null, 'Sale price must be a number (0 or higher).');
          return;
        }
        salePrice = parsed;
      }
    }

    if (salePrice != null && salePrice >= price) {
      setStatus(null, 'Sale must be less than the regular price.');
      return;
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
      setStatus(null, 'Sale start date is invalid.');
      return;
    }
    if (edit.saleEndDate.trim() && !saleEndDate) {
      setStatus(null, 'Sale end date is invalid.');
      return;
    }

    const baseInventory = product.inventory ?? {
      quantity: 0,
      lowStockThreshold: 0,
      status: 'in_stock',
      allowBackorder: false,
      leadTime: '',
    };

    setSavingId(product.id);
    try {
      await productsApi.update(product.id, {
        price,
        salePrice,
        saleStartDate,
        saleEndDate,
        inventory: {
          ...baseInventory,
          quantity,
          lowStockThreshold,
          allowBackorder: edit.allowBackorder,
        },
      });
      await onRefresh();
      setStatus('Inventory updated');
    } catch (error) {
      console.error(error);
      setStatus(null, error instanceof Error ? error.message : 'Failed to update inventory');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
          <p className="text-sm text-slate-600">Restock products, adjust pricing, and schedule sales.</p>
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
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6">
        {!filteredProducts.length ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
            No products match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-left font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Low stock</th>
                  <th className="px-4 py-3 text-left font-semibold">Price</th>
                  <th className="px-4 py-3 text-left font-semibold">Sale</th>
                  <th className="px-4 py-3 text-left font-semibold">Sales period</th>
                  <th className="px-4 py-3 text-left font-semibold">Backorder</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const edit = edits[product.id] ?? getDefaultEditState(product);
                  const outOfStock = isOutOfStock(product);
                  const status = outOfStock ? 'out_of_stock' : (product.inventory?.status ?? 'in_stock');
                  const statusLabel = status.replace(/_/g, ' ');
                  const rowHasEdits = hasEdits(product);
                  const isSaving = savingId === product.id;
                  const currentQuantity = product.inventory?.quantity ?? 0;
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

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'transition-colors',
                        outOfStock ? 'bg-rose-50/40' : 'hover:bg-slate-50'
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-3">
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
                            <div className="mt-1 flex flex-nowrap items-center gap-2 text-xs text-slate-600">
                              {product.sku ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 whitespace-nowrap">
                                  SKU: {product.sku}
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 font-semibold capitalize',
                                  status === 'out_of_stock'
                                    ? 'bg-rose-600 text-white'
                                    : status === 'low_stock'
                                      ? 'bg-amber-500 text-white'
                                      : status === 'backorder' || status === 'preorder'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                )}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('inline-flex h-9 min-w-16 items-center justify-center rounded-lg border px-3 text-sm font-semibold', quantityPillClass)}>
                              {currentQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplenishId((current) => (current === product.id ? null : product.id));
                                updateFieldForProduct(product, 'replenishBy', '');
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                              aria-label="Replenish stock"
                            >
                              +
                            </button>
                            {Number.parseInt(edit.quantity, 10) !== currentQuantity && Number.isFinite(Number.parseInt(edit.quantity, 10)) ? (
                              <span className="text-xs text-slate-600 whitespace-nowrap">Next: {Number.parseInt(edit.quantity, 10)}</span>
                            ) : null}
                          </div>

                          {activeReplenishId === product.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                value={edit.replenishBy}
                                onChange={(event) => updateFieldForProduct(product, 'replenishBy', event.target.value)}
                                placeholder="Add"
                                className="h-9 w-24 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                                className="h-9 rounded-lg border border-primary bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary/90"
                              >
                                Add
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          value={edit.lowStockThreshold}
                          onChange={(event) => updateFieldForProduct(product, 'lowStockThreshold', event.target.value)}
                          className="h-9 w-24 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={edit.price}
                          onChange={(event) => updateFieldForProduct(product, 'price', event.target.value)}
                          className="h-9 w-28 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <select
                            value={edit.saleType}
                            onChange={(event) => updateFieldForProduct(product, 'saleType', event.target.value as ProductInventoryEditState['saleType'])}
                            className="h-9 w-28 rounded-lg border border-border bg-white px-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="percentage">%</option>
                            <option value="price">Price</option>
                          </select>
                          {edit.saleType === 'percentage' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                value={edit.salePercentage}
                                onChange={(event) => updateFieldForProduct(product, 'salePercentage', event.target.value)}
                                placeholder="%"
                                className="h-9 w-20 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={edit.salePrice}
                              onChange={(event) => updateFieldForProduct(product, 'salePrice', event.target.value)}
                              placeholder="—"
                              className="h-9 w-28 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <label className="grid gap-1 text-[0.7rem] font-semibold text-slate-500">
                            Start
                            <input
                              type="date"
                              value={edit.saleStartDate}
                              onChange={(event) => updateFieldForProduct(product, 'saleStartDate', event.target.value)}
                              className="h-9 w-44 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </label>
                          <label className="grid gap-1 text-[0.7rem] font-semibold text-slate-500">
                            End
                            <input
                              type="date"
                              value={edit.saleEndDate}
                              onChange={(event) => updateFieldForProduct(product, 'saleEndDate', event.target.value)}
                              className="h-9 w-44 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={edit.allowBackorder}
                            onChange={(event) => updateFieldForProduct(product, 'allowBackorder', event.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                          />
                          <span className="text-xs">Allow</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenProduct(product.id)}
                            className="h-9 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                          >
                            Edit details
                          </button>
                          <button
                            type="button"
                            disabled={!rowHasEdits || isSaving}
                            onClick={() => void saveProduct(product)}
                            className={cn(
                              'h-9 rounded-lg px-3 text-xs font-semibold transition',
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
