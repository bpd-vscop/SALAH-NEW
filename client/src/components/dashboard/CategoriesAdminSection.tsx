import { useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { Category } from '../../types/api';
import type { CategoryFormState, CategoryDisplayFormState } from './types';
import { cn } from '../../utils/cn';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

const FALLBACK_COLORS = ['#f97316', '#ef4444', '#6366f1', '#0ea5e9', '#10b981', '#facc15'];

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface CategoriesAdminSectionProps {
  categories: Category[];
  parentLabelMap: Map<string, string>;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  manageForm: CategoryFormState;
  setManageForm: Dispatch<SetStateAction<CategoryFormState>>;
  onManageSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  view: 'manage' | 'display';
  displayForm: CategoryDisplayFormState;
  setDisplayForm: Dispatch<SetStateAction<CategoryDisplayFormState>>;
  onDisplaySave: () => Promise<void>;
  displaySaving: boolean;
  maxHomepageCategories: number;
}

const handleUpload = async (
  file: File | undefined,
  setter: (value: string) => void
) => {
  if (!file) {
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    window.alert(`Image must be ${MAX_IMAGE_MB} MB or smaller.`);
    return;
  }
  try {
    const dataUrl = await fileToDataUrl(file);
    setter(dataUrl);
  } catch (error) {
    console.error('Failed to read file', error);
    window.alert('Failed to read image file. Please try a different image.');
  }
};

export const CategoriesAdminSection: React.FC<CategoriesAdminSectionProps> = ({
  categories,
  parentLabelMap,
  selectedCategoryId,
  onSelectCategory,
  manageForm,
  setManageForm,
  onManageSubmit,
  onDelete,
  view,
  displayForm,
  setDisplayForm,
  onDisplaySave,
  displaySaving,
  maxHomepageCategories,
}) => {
  const [selectedCategoryForOrder, setSelectedCategoryForOrder] = useState<string | null>(null);

  const categoriesMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const assignedOrders = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(displayForm.homepageAssignments).forEach(([order, id]) => {
      if (id) {
        map.set(id, Number(order));
      }
    });
    return map;
  }, [displayForm.homepageAssignments]);

  const handleOrderChange = (categoryId: string, rawOrder: string) => {
    setDisplayForm((state) => {
      const nextAssignments: Record<number, string> = { ...state.homepageAssignments };

      // remove existing assignment for this category
      Object.keys(nextAssignments).forEach((order) => {
        if (nextAssignments[Number(order)] === categoryId) {
          delete nextAssignments[Number(order)];
        }
      });

      const trimmed = rawOrder.trim();
      if (!trimmed) {
        return { ...state, homepageAssignments: nextAssignments };
      }

      const nextOrder = Number(trimmed);
      if (!Number.isFinite(nextOrder)) {
        window.alert(`Enter a number between 1 and ${maxHomepageCategories}.`);
        return state;
      }

      if (nextOrder <= 0) {
        return { ...state, homepageAssignments: nextAssignments };
      }

      if (nextOrder > maxHomepageCategories) {
        window.alert(`Enter a number between 1 and ${maxHomepageCategories}.`);
        return state;
      }

      const existingId = nextAssignments[nextOrder];
      if (existingId && existingId !== categoryId) {
        const existingName = categoriesMap.get(existingId)?.name ?? 'another category';
        window.alert(`Order ${nextOrder} is currently assigned to ${existingName}. It will be replaced.`);
        delete nextAssignments[nextOrder];
      }

      nextAssignments[nextOrder] = categoryId;
      return { ...state, homepageAssignments: nextAssignments };
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategoryForOrder === categoryId) {
      setSelectedCategoryForOrder(null);
    } else {
      setSelectedCategoryForOrder(categoryId);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
      </div>

      {view === 'manage' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Parent</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Hero</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{parentLabelMap.get(category.id)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-12 w-12 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted">No image</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {category.heroImageUrl ? (
                        <img
                          src={category.heroImageUrl}
                          alt={`${category.name} hero`}
                          className="h-12 w-20 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted">No hero image</span>
                      )}
                    </td>
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
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={onManageSubmit}>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Name
              <input
                type="text"
                value={manageForm.name}
                onChange={(event) => setManageForm((state) => ({ ...state, name: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Parent category
              <select
                value={manageForm.parentId}
                onChange={(event) => setManageForm((state) => ({ ...state, parentId: event.target.value }))}
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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-medium">Category image (max {MAX_IMAGE_MB} MB)</span>
                <label
                  className={cn(
                    'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    manageForm.imageUrl
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-red-200 bg-red-100 text-red-700'
                  )}
                >
                  <span>{manageForm.imageUrl ? 'Replace image' : 'Upload image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      await handleUpload(file, (value) => setManageForm((state) => ({ ...state, imageUrl: value })));
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                {manageForm.imageUrl ? (
                  <div className="flex flex-col gap-2">
                    <img
                      src={manageForm.imageUrl}
                      alt="Category preview"
                      className="h-24 w-24 rounded-full border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="w-fit rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                      onClick={() => setManageForm((state) => ({ ...state, imageUrl: '' }))}
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No category image uploaded yet.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-medium">Hero image (max {MAX_IMAGE_MB} MB)</span>
                <label
                  className={cn(
                    'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    manageForm.heroImageUrl
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                  )}
                >
                  <span>{manageForm.heroImageUrl ? 'Replace hero image' : 'Upload hero image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      await handleUpload(file, (value) => setManageForm((state) => ({ ...state, heroImageUrl: value })));
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                {manageForm.heroImageUrl ? (
                  <div className="flex flex-col gap-2">
                    <img
                      src={manageForm.heroImageUrl}
                      alt="Hero preview"
                      className="h-36 w-full rounded-2xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="w-fit rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                      onClick={() => setManageForm((state) => ({ ...state, heroImageUrl: '' }))}
                    >
                      Remove hero image
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No hero image uploaded.</p>
                )}
              </div>
            </div>

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
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">All categories hero image</h3>
              <span className="text-xs text-muted">max {MAX_IMAGE_MB} MB</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
              <label
                className={cn(
                  'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                  displayForm.allCategoriesHeroImage
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                )}
              >
                <span>{displayForm.allCategoriesHeroImage ? 'Replace hero image' : 'Upload hero image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    await handleUpload(file, (value) =>
                      setDisplayForm((state) => ({ ...state, allCategoriesHeroImage: value }))
                    );
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              {displayForm.allCategoriesHeroImage ? (
                <div className="flex flex-col gap-2">
                  <img
                    src={displayForm.allCategoriesHeroImage}
                    alt="All categories hero preview"
                    className="h-40 w-full rounded-2xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    className="w-fit rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                    onClick={() =>
                      setDisplayForm((state) => ({ ...state, allCategoriesHeroImage: '' }))
                    }
                  >
                    Remove hero image
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">No hero image uploaded.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Homepage categories</h3>
              <span className="text-xs text-muted">Click to assign order (1–{maxHomepageCategories})</span>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
                No categories available yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 lg:gap-8">
                {categories.map((category, index) => {
                  const fallbackColor = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                  const assignedOrder = assignedOrders.get(category.id);
                  const isSelected = selectedCategoryForOrder === category.id;

                  return (
                    <div key={category.id} className="flex flex-col items-center text-center p-2">
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(category.id)}
                        className="group relative flex flex-col items-center rounded-lg p-2 transition-all duration-300 hover:bg-slate-50"
                      >
                        <div
                          className={cn(
                            "relative mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 bg-white transition-all duration-300",
                            isSelected
                              ? "border-primary scale-110 shadow-lg"
                              : assignedOrder
                                ? "border-emerald-500 group-hover:border-primary group-hover:scale-105"
                                : "border-slate-200 group-hover:border-primary group-hover:scale-105"
                          )}
                        >
                          {category.imageUrl ? (
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="absolute inset-0 m-auto h-full w-full scale-110 p-1 object-contain transition-transform duration-300 group-hover:scale-125"
                            />
                          ) : (
                            <span
                              className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold text-white"
                              style={{ background: fallbackColor }}
                            >
                              {category.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          {assignedOrder && (
                            <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">
                              {assignedOrder}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm font-medium transition-colors duration-300",
                          isSelected ? "text-primary" : assignedOrder ? "text-emerald-600" : "text-slate-700 group-hover:text-primary"
                        )}>
                          {category.name}
                        </span>
                      </button>

                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={maxHomepageCategories}
                            value={assignedOrder ?? ''}
                            placeholder="Order"
                            autoFocus
                            className="h-8 w-16 rounded-lg border-2 border-primary bg-white px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onChange={(event) => {
                              const value = event.target.value;
                              const numValue = Number(value);

                              // Only allow values >= 1
                              if (value !== '' && numValue < 1) {
                                return;
                              }

                              handleOrderChange(category.id, value);
                              if (value) {
                                setSelectedCategoryForOrder(null);
                              }
                            }}
                            onBlur={() => setSelectedCategoryForOrder(null)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === 'Escape') {
                                setSelectedCategoryForOrder(null);
                              }
                              // Prevent minus sign and other non-numeric keys
                              if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
                                event.preventDefault();
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { void onDisplaySave(); }}
                disabled={displaySaving}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {displaySaving ? 'Saving…' : 'Save display settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
