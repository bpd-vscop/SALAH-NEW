import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { couponsApi } from '../../api/coupons';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Select } from '../ui/Select';
import type { Category, Coupon, CouponType, Product } from '../../types/api';
import type { StatusSetter } from './types';

interface CouponsAdminSectionProps {
  categories: Category[];
  products: Product[];
  setStatus: StatusSetter;
}

interface CouponFormState {
  code: string;
  type: CouponType;
  amount: string;
  isActive: boolean;
  categoryIds: string[];
  productIds: string[];
}

const emptyForm: CouponFormState = {
  code: '',
  type: 'percentage',
  amount: '',
  isActive: true,
  categoryIds: [],
  productIds: [],
};

const formatCouponValue = (coupon: Coupon) =>
  coupon.type === 'percentage' ? `${coupon.amount}%` : formatCurrency(coupon.amount);

const buildAppliesLabel = (coupon: Coupon) => {
  const categoryCount = coupon.categoryIds?.length ?? 0;
  const productCount = coupon.productIds?.length ?? 0;
  if (!categoryCount && !productCount) return 'All products';
  const parts = [];
  if (categoryCount) parts.push(`${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`);
  if (productCount) parts.push(`${productCount} product${productCount === 1 ? '' : 's'}`);
  return parts.join(' / ');
};

export const CouponsAdminSection: React.FC<CouponsAdminSectionProps> = ({
  categories,
  products,
  setStatus,
}) => {
  const [list, setList] = useState<Coupon[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryPick, setCategoryPick] = useState('');
  const [productPick, setProductPick] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const { coupons } = await couponsApi.list();
    setList(coupons);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm);
      return;
    }
    const existing = list.find((coupon) => coupon.id === selectedId);
    if (existing) {
      setForm({
        code: existing.code ?? '',
        type: existing.type,
        amount: Number.isFinite(existing.amount) ? String(existing.amount) : '',
        isActive: existing.isActive !== false,
        categoryIds: existing.categoryIds ?? [],
        productIds: existing.productIds ?? [],
      });
    }
  }, [selectedId, list]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const productNameById = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products]
  );

  const filteredCoupons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;
    return list.filter((coupon) => coupon.code.toLowerCase().includes(query));
  }, [list, searchQuery]);

  const availableCategoryOptions = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return categories
      .filter((category) => !form.categoryIds.includes(category.id))
      .filter((category) => (query ? category.name.toLowerCase().includes(query) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({ value: category.id, label: category.name }));
  }, [categories, form.categoryIds, categorySearch]);

  const availableProductOptions = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products
      .filter((product) => !form.productIds.includes(product.id))
      .filter((product) => {
        if (!query) return true;
        const name = product.name?.toLowerCase() ?? '';
        const sku = product.sku?.toLowerCase() ?? '';
        return name.includes(query) || sku.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({
        value: product.id,
        label: product.sku ? `${product.name} (${product.sku})` : product.name,
      }));
  }, [products, form.productIds, productSearch]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code) {
      setStatus(null, 'Coupon code is required.');
      return;
    }
    const amount = Number.parseFloat(form.amount);
    if (!Number.isFinite(amount)) {
      setStatus(null, 'Discount amount must be a number.');
      return;
    }
    if (form.type === 'percentage' && amount > 100) {
      setStatus(null, 'Percentage discounts cannot exceed 100.');
      return;
    }
    if (amount < 0) {
      setStatus(null, 'Discount amount must be 0 or more.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code,
        type: form.type,
        amount,
        isActive: form.isActive,
        categoryIds: form.categoryIds,
        productIds: form.productIds,
      };
      if (selectedId) {
        await couponsApi.update(selectedId, payload);
        setStatus('Coupon updated');
      } else {
        await couponsApi.create(payload);
        setStatus('Coupon created');
      }
      await refresh();
      setSelectedId('');
      setCategoryPick('');
      setProductPick('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Coupon operation failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await couponsApi.delete(deleteId);
      await refresh();
      setStatus('Coupon deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete coupon');
    } finally {
      setDeleteId(null);
    }
  };

  const toggleCouponActive = async (coupon: Coupon) => {
    const nextActive = !coupon.isActive;
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(coupon.id);
      return next;
    });
    try {
      const { coupon: updated } = await couponsApi.update(coupon.id, { isActive: nextActive });
      setList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedId === updated.id) {
        setForm((state) => ({ ...state, isActive: updated.isActive }));
      }
      setStatus(updated.isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to update coupon');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(coupon.id);
        return next;
      });
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Coupons</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[11fr_9fr]">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full sm:w-auto items-center gap-2">
              <input
                type="search"
                placeholder="Search coupons"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-7 w-full sm:w-64 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="h-[520px] overflow-y-auto rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold w-[8%]">Active</th>
                  <th className="px-4 py-3 font-semibold w-[20%]">Code</th>
                  <th className="px-4 py-3 font-semibold">Discount</th>
                  <th className="px-4 py-3 font-semibold">Applies to</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 text-center w-[8%]">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={coupon.isActive}
                        onClick={() => void toggleCouponActive(coupon)}
                        disabled={updatingIds.has(coupon.id)}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full border transition',
                          coupon.isActive ? 'border-primary bg-primary' : 'border-slate-300 bg-slate-200',
                          updatingIds.has(coupon.id) && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3 w-3 rounded-full bg-white shadow transition',
                            coupon.isActive ? 'translate-x-4' : 'translate-x-1'
                          )}
                        />
                        <span className="sr-only">Toggle coupon active</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 w-[20%] break-all">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCouponValue(coupon)}</td>
                    <td className="px-4 py-3 text-slate-600">{buildAppliesLabel(coupon)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                          coupon.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(coupon.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-slate-600 transition hover:border-primary hover:text-primary"
                          aria-label={`Edit coupon ${coupon.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(coupon.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                          aria-label={`Delete coupon ${coupon.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredCoupons.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                      No coupons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Coupon code
              <input
                type="text"
                value={form.code}
                onChange={(event) => setForm((state) => ({ ...state, code: event.target.value.toUpperCase() }))}
                placeholder="SUMMER25"
                className="h-7 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Discount type
              <Select
                value={form.type}
                onChange={(value) => setForm((state) => ({ ...state, type: value as CouponType }))}
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed amount' },
                ]}
                placeholder="Select type"
              />
            </label>
          </div>

          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Discount amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((state) => ({ ...state, amount: event.target.value }))}
                placeholder={form.type === 'percentage' ? '10' : '25.00'}
                className="h-7 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </label>
          </div>

          <div className="rounded-xl border border-border bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Apply to categories</p>
                <p className="text-xs text-slate-500">Optional. Leave empty to apply to all products.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <input
                type="search"
                placeholder="Search categories"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                className="h-7 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Select
                value={categoryPick}
                onChange={(value) => {
                  if (!value) return;
                  setForm((state) => ({
                    ...state,
                    categoryIds: [...state.categoryIds, value],
                  }));
                  setCategoryPick('');
                }}
                options={availableCategoryOptions}
                placeholder={availableCategoryOptions.length ? 'Select category' : 'No categories available'}
                disabled={!availableCategoryOptions.length}
              />
              <div className="flex flex-wrap gap-2">
                {form.categoryIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {categoryNameById.get(id) ?? 'Unknown category'}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((state) => ({
                          ...state,
                          categoryIds: state.categoryIds.filter((categoryId) => categoryId !== id),
                        }))
                      }
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Remove category"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {!form.categoryIds.length && (
                  <span className="text-xs text-slate-500">No categories selected.</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Apply to products</p>
                <p className="text-xs text-slate-500">Optional. Use to target individual products.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <input
                type="search"
                placeholder="Search products"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="h-7 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Select
                value={productPick}
                onChange={(value) => {
                  if (!value) return;
                  setForm((state) => ({
                    ...state,
                    productIds: [...state.productIds, value],
                  }));
                  setProductPick('');
                }}
                options={availableProductOptions}
                placeholder={availableProductOptions.length ? 'Select product' : 'No products available'}
                disabled={!availableProductOptions.length}
              />
              <div className="flex flex-wrap gap-2">
                {form.productIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {productNameById.get(id) ?? 'Unknown product'}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((state) => ({
                          ...state,
                          productIds: state.productIds.filter((productId) => productId !== id),
                        }))
                      }
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Remove product"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {!form.productIds.length && (
                  <span className="text-xs text-slate-500">No products selected.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
              disabled={loading}
            >
              {selectedId ? 'Save changes' : 'Create coupon'}
            </button>
            {selectedId && (
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:border-primary hover:text-primary"
                onClick={() => setSelectedId('')}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this coupon?</p>
                <p className="mt-2 text-sm font-semibold text-red-600">This is a hard delete and cannot be recovered.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
