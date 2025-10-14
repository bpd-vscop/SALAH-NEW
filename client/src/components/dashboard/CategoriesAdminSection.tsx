import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { Category } from '../../types/api';
import type { CategoryFormState } from './types';

interface CategoriesAdminSectionProps {
  categories: Category[];
  parentLabelMap: Map<string, string>;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  form: CategoryFormState;
  setForm: Dispatch<SetStateAction<CategoryFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const CategoriesAdminSection: React.FC<CategoriesAdminSectionProps> = ({
  categories,
  parentLabelMap,
  selectedCategoryId,
  onSelectCategory,
  form,
  setForm,
  onSubmit,
  onDelete,
}) => (
  <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
        <p className="text-sm text-muted">Organize products into logical groups.</p>
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Parent</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{parentLabelMap.get(category.id)}</td>
                <td className="flex items-center justify-end gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => onSelectCategory(category.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    onClick={() => void onDelete(category.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div>
        <form
          className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
          onSubmit={onSubmit}
        >
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">
              {selectedCategoryId ? 'Update category' : 'Create category'}
            </h3>
            <p className="text-xs text-muted">Nest categories to build hierarchies.</p>
          </div>
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
            Parent category
            <select
              value={form.parentId}
              onChange={(event) => setForm((state) => ({ ...state, parentId: event.target.value }))}
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Top-level</option>
              {categories
                .filter((category) => category.id !== selectedCategoryId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
          >
            {selectedCategoryId ? 'Save changes' : 'Create category'}
          </button>
          {selectedCategoryId && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
              onClick={() => onSelectCategory('')}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  </section>
);

