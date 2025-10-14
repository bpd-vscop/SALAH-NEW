import type { Dispatch, SetStateAction } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import type { MenuLinkInput, MenuSectionInput } from '../../api/menu';
import type { Category, Product } from '../../types/api';
import { cn } from '../../utils/cn';
import {
  BatteryFull,
  Car,
  Cpu,
  Key,
  Package,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface NavigationAdminSectionProps {
  sections: MenuSectionInput[];
  links: MenuLinkInput[];
  setSections: Dispatch<SetStateAction<MenuSectionInput[]>>;
  setLinks: Dispatch<SetStateAction<MenuLinkInput[]>>;
  categories: Category[];
  products: Product[];
  onSave: () => Promise<void>;
  saving: boolean;
  canEdit: boolean;
}

const ICON_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'car', label: 'Car & Remotes', icon: Car },
  { value: 'truck', label: 'Delivery & Fleet', icon: Truck },
  { value: 'package', label: 'Accessories', icon: Package },
  { value: 'wrench', label: 'Tools & Repair', icon: Wrench },
  { value: 'key', label: 'Keys', icon: Key },
  { value: 'shield', label: 'Security', icon: Shield },
  { value: 'cpu', label: 'Electronics', icon: Cpu },
  { value: 'battery', label: 'Power & Battery', icon: BatteryFull },
  { value: 'shopping-bag', label: 'Bags & Merch', icon: ShoppingBag },
  { value: 'shopping-cart', label: 'Cart', icon: ShoppingCart },
  { value: 'sparkles', label: 'Promotions', icon: Sparkles },
];

const emptySection = (order: number): MenuSectionInput => ({
  name: '',
  icon: ICON_OPTIONS[0]?.value ?? 'sparkles',
  order,
  items: [],
});

const emptyLink = (order: number): MenuLinkInput => ({
  label: '',
  href: '',
  order,
});

export const NavigationAdminSection: React.FC<NavigationAdminSectionProps> = ({
  sections,
  links,
  setSections,
  setLinks,
  categories,
  products,
  onSave,
  saving,
  canEdit,
}) => {
  const updateSection = (index: number, updater: (section: MenuSectionInput) => MenuSectionInput) => {
    setSections((current) => current.map((section, idx) => (idx === index ? updater(section) : section)));
  };

  const addSection = () => {
    setSections((current) => [...current, emptySection(current.length)]);
  };

  const removeSection = (index: number) => {
    setSections((current) => current.filter((_, idx) => idx !== index));
  };

  const addItem = (sectionIndex: number) => {
    updateSection(sectionIndex, (section) => {
      const items = section.items ?? [];
      return {
        ...section,
        items: [
          ...items,
          {
            categoryId: '',
            productId: undefined,
            order: items.length,
          },
        ],
      };
    });
  };

  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    updater: (item: NonNullable<MenuSectionInput['items']>[number]) => NonNullable<MenuSectionInput['items']>[number]
  ) => {
    updateSection(sectionIndex, (section) => {
      const items = section.items ?? [];
      return {
        ...section,
        items: items.map((item, idx) => (idx === itemIndex ? updater(item) : item)),
      };
    });
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    updateSection(sectionIndex, (section) => {
      const items = section.items ?? [];
      return {
        ...section,
        items: items.filter((_, idx) => idx !== itemIndex),
      };
    });
  };

  const addLink = () => {
    setLinks((current) => {
      if (current.length >= 3) {
        return current;
      }
      return [...current, emptyLink(current.length)];
    });
  };

  const updateLink = (index: number, updater: (link: MenuLinkInput) => MenuLinkInput) => {
    setLinks((current) => current.map((link, idx) => (idx === index ? updater(link) : link)));
  };

  const removeLink = (index: number) => {
    setLinks((current) => current.filter((_, idx) => idx !== index));
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-1" />
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70',
            !canEdit && 'pointer-events-none opacity-50'
          )}
          onClick={onSave}
          disabled={saving || !canEdit}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save navigation'}
        </button>
      </header>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Sections</h3>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary/60 hover:text-primary-dark disabled:opacity-60"
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4" />
            Add section
          </button>
        </div>

        {!sections.length && (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
            No sections yet. Start by adding a section and assigning categories.
          </p>
        )}

        <div className="space-y-4">
          {sections.map((section, sectionIndex) => {
            const IconPreview = ICON_OPTIONS.find((opt) => opt.value === section.icon)?.icon ?? Sparkles;
            return (
              <div key={section.id ?? `section-${sectionIndex}`} className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <IconPreview className="h-6 w-6 text-red-600" />
                    <h4 className="text-base font-semibold text-slate-900">
                      {section.name?.trim() || 'Untitled section'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <GripVertical className="hidden h-4 w-4 text-slate-400 sm:block" />
                    <button
                      type="button"
                      onClick={() => removeSection(sectionIndex)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      disabled={!canEdit}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px]">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Name
                    <input
                      type="text"
                      value={section.name}
                      maxLength={40}
                      onChange={(event) =>
                        updateSection(sectionIndex, (prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!canEdit}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Icon
                    <select
                      value={section.icon}
                      onChange={(event) =>
                        updateSection(sectionIndex, (prev) => ({ ...prev, icon: event.target.value }))
                      }
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!canEdit}
                    >
                      {ICON_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Display order
                    <input
                      type="number"
                      value={section.order ?? sectionIndex}
                      onChange={(event) =>
                        updateSection(sectionIndex, (prev) => ({
                          ...prev,
                          order: Number(event.target.value),
                        }))
                      }
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-slate-900">Assigned categories</h5>
                    <button
                      type="button"
                      onClick={() => addItem(sectionIndex)}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/60 hover:text-primary-dark disabled:opacity-60"
                      disabled={!canEdit}
                    >
                      <Plus className="h-4 w-4" />
                      Add category
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(section.items ?? []).map((item, itemIndex) => (
                      <div
                        key={item.id ?? `section-${sectionIndex}-item-${itemIndex}`}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-background p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_32px]"
                      >
                        <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                          Category
                          <select
                            value={item.categoryId ?? ''}
                            onChange={(event) =>
                              updateItem(sectionIndex, itemIndex, (prev) => ({
                                ...prev,
                                categoryId: event.target.value,
                              }))
                            }
                            className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={!canEdit}
                            required
                          >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                          Featured product (optional)
                          <select
                            value={item.productId ?? ''}
                            onChange={(event) =>
                              updateItem(sectionIndex, itemIndex, (prev) => ({
                                ...prev,
                                productId: event.target.value || undefined,
                              }))
                            }
                            className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={!canEdit}
                          >
                            <option value="">None</option>
                            {products.slice(0, 200).map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                          Order
                          <input
                            type="number"
                            value={item.order ?? itemIndex}
                            onChange={(event) =>
                              updateItem(sectionIndex, itemIndex, (prev) => ({
                                ...prev,
                                order: Number(event.target.value),
                              }))
                            }
                            className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={!canEdit}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeItem(sectionIndex, itemIndex)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          aria-label="Remove category"
                          disabled={!canEdit}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {!(section.items ?? []).length && (
                      <p className="rounded-lg border border-dashed border-border bg-white px-3 py-2 text-xs text-muted">
                        No categories assigned yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Quick links</h3>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary/60 hover:text-primary-dark disabled:opacity-60"
            disabled={!canEdit || links.length >= 3}
          >
            <Plus className="h-4 w-4" />
            Add link
          </button>
        </div>
        <div className="space-y-3">
          {links.map((link, index) => (
            <div
              key={link.id ?? `link-${index}`}
              className="grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_32px]"
            >
              <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                Label
                <input
                  type="text"
                  value={link.label}
                  maxLength={32}
                  onChange={(event) =>
                    updateLink(index, (prev) => ({ ...prev, label: event.target.value }))
                  }
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canEdit}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                URL
                <input
                  type="text"
                  value={link.href}
                  onChange={(event) =>
                    updateLink(index, (prev) => ({ ...prev, href: event.target.value }))
                  }
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canEdit}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                Order
                <input
                  type="number"
                  value={link.order ?? index}
                  onChange={(event) =>
                    updateLink(index, (prev) => ({ ...prev, order: Number(event.target.value) }))
                  }
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canEdit}
                />
              </label>
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                aria-label="Remove link"
                disabled={!canEdit}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!links.length && (
            <p className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
              No quick links configured yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

