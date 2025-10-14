import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { Category, Product, ProductTag } from '../../types/api';
import type { ProductFormState } from './types';

interface ProductsAdminSectionProps {
  products: Product[];
  categories: Category[];
  categoryNameById: Map<string, string>;
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  form: ProductFormState;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  productTags: ProductTag[];
}

export const ProductsAdminSection: React.FC<ProductsAdminSectionProps> = ({
  products,
  categories,
  categoryNameById,
  selectedProductId,
  onSelectProduct,
  form,
  setForm,
  onSubmit,
  onDelete,
  productTags,
}) => (
  <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <div className="h-1" />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        {products.map((product) => (
          <article
            key={product.id}
            className={cn(
              'rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary hover:shadow-md',
              selectedProductId === product.id && 'border-primary bg-white shadow-md'
            )}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="text-xs text-muted">
                    {categoryNameById.get(product.categoryId) ?? 'Unassigned'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(product.price ?? 0)}
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-muted">
                  {product.description.length > 180 ? `${product.description.slice(0, 180)}…` : product.description}
                </p>
              )}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  onClick={() => onSelectProduct(product.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  onClick={() => void onDelete(product.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
        {!products.length && (
          <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            No products yet.
          </p>
        )}
      </div>
      <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Category
          <select
            value={form.categoryId}
            onChange={(event) => setForm((state) => ({ ...state, categoryId: event.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Price
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(event) =>
              setForm((state) => ({ ...state, price: Number.parseFloat(event.target.value) || 0 }))
            }
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Description
          <textarea
            value={form.description}
            onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
            rows={4}
            className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {productTags.map((tag) => {
            const active = form.tags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setForm((state) => {
                    const nextTags = new Set(state.tags);
                    if (nextTags.has(tag)) {
                      nextTags.delete(tag);
                    } else {
                      nextTags.add(tag);
                    }
                    return { ...state, tags: nextTags };
                  })
                }
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
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Images (comma separated URLs)
          <textarea
            value={form.images}
            onChange={(event) => setForm((state) => ({ ...state, images: event.target.value }))}
            rows={3}
            className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
        >
          {selectedProductId ? 'Save changes' : 'Create product'}
        </button>
        {selectedProductId && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
            onClick={() => onSelectProduct('')}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  </section>
);
