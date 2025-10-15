import { useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Save, Edit3, X } from 'lucide-react';
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
  section: 'topnav' | 'sections' | 'quicklinks' | 'visible';
  sections: MenuSectionInput[];
  links: MenuLinkInput[];
  promoText: string;
  promoVisible: boolean;
  setSections: Dispatch<SetStateAction<MenuSectionInput[]>>;
  setLinks: Dispatch<SetStateAction<MenuLinkInput[]>>;
  setPromoText: Dispatch<SetStateAction<string>>;
  setPromoVisible: Dispatch<SetStateAction<boolean>>;
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

const MAX_SECTIONS = 8;
const MAX_QUICK_LINKS = 6;
const MAX_VISIBLE_ITEMS = 7;

const emptySection = (order: number): MenuSectionInput => ({
  id: `new-section-${Date.now()}-${Math.random()}`,
  name: '',
  icon: ICON_OPTIONS[0]?.value ?? 'sparkles',
  order,
  items: [],
  visible: true,
});

const emptyLink = (order: number): MenuLinkInput => ({
  id: `new-link-${Date.now()}-${Math.random()}`,
  label: '',
  href: '',
  order,
  visible: true,
});

export const NavigationAdminSection: React.FC<NavigationAdminSectionProps> = ({
  section,
  sections,
  links,
  promoText,
  promoVisible,
  setSections,
  setLinks,
  setPromoText,
  setPromoVisible,
  categories,
  products,
  onSave,
  saving,
  canEdit,
}) => {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const getVisibleCount = () =>
    sections.filter((s) => s.visible !== false).length + links.filter((link) => link.visible !== false).length;

  const updateSection = (index: number, updater: (section: MenuSectionInput) => MenuSectionInput) => {
    setSections((current) => current.map((s, idx) => (idx === index ? updater(s) : s)));
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    const newSection = {
      ...emptySection(sections.length),
      visible: getVisibleCount() < MAX_VISIBLE_ITEMS,
    };
    setSections((current) => [...current, newSection]);
    setEditingSectionId(newSection.id!);
  };

  const removeSection = (index: number) => {
    const sectionId = sections[index]?.id;
    if (sectionId && editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
    setSections((current) => current.filter((_, idx) => idx !== index));
  };

  const addItem = (sectionIndex: number) => {
    updateSection(sectionIndex, (s) => {
      const items = s.items ?? [];
      return {
        ...s,
        items: [
          ...items,
          {
            id: `new-item-${Date.now()}-${Math.random()}`,
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
    updateSection(sectionIndex, (s) => {
      const items = s.items ?? [];
      return {
        ...s,
        items: items.map((item, idx) => (idx === itemIndex ? updater(item) : item)),
      };
    });
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    updateSection(sectionIndex, (s) => {
      const items = s.items ?? [];
      return {
        ...s,
        items: items.filter((_, idx) => idx !== itemIndex),
      };
    });
  };

  const addLink = () => {
    if (links.length >= MAX_QUICK_LINKS) return;
    const newLink = {
      ...emptyLink(links.length),
      visible: getVisibleCount() < MAX_VISIBLE_ITEMS,
    };
    setLinks((current) => [...current, newLink]);
    setEditingLinkId(newLink.id!);
  };

  const updateLink = (index: number, updater: (link: MenuLinkInput) => MenuLinkInput) => {
    setLinks((current) => current.map((link, idx) => (idx === index ? updater(link) : link)));
  };

  const removeLink = (index: number) => {
    const linkId = links[index]?.id;
    if (linkId && editingLinkId === linkId) {
      setEditingLinkId(null);
    }
    setLinks((current) => current.filter((_, idx) => idx !== index));
  };

  const visibleCount = getVisibleCount();

  const toggleVisibleItem = (item: {
    type: 'section' | 'link';
    index: number;
    visible: boolean;
  }) => {
    if (!item.visible && visibleCount >= MAX_VISIBLE_ITEMS) {
      return;
    }

    if (item.type === 'section') {
      updateSection(item.index, (section) => ({
        ...section,
        visible: !(section.visible !== false),
      }));
    } else {
      updateLink(item.index, (link) => ({
        ...link,
        visible: !(link.visible !== false),
      }));
    }
  };

  const handleSaveSection = async () => {
    await onSave();
    setEditingSectionId(null);
  };

  const handleSaveLink = async () => {
    await onSave();
    setEditingLinkId(null);
  };

  const allItems = [
    ...sections.map((s, index) => ({
      id: s.id ?? `section-${index}`,
      type: 'section' as const,
      label: s.name || 'Untitled section',
      icon: ICON_OPTIONS.find((opt) => opt.value === s.icon)?.icon ?? Sparkles,
      index,
      visible: s.visible !== false,
    })),
    ...links.map((link, index) => ({
      id: link.id ?? `link-${index}`,
      type: 'link' as const,
      label: link.label || 'Untitled link',
      href: link.href,
      index,
      visible: link.visible !== false,
    })),
  ];

  return (
    <div>
      <AnimatePresence mode="wait">
        {section === 'topnav' ? (
          <motion.section
            key="topnav"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                Top nav promo banner
              </span>

              <button
                type="button"
                onClick={onSave}
                disabled={saving || !canEdit}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70',
                  !canEdit && 'pointer-events-none opacity-50'
                )}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save promo banner'}
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Control the promotional banner that appears at the top of the site header.
              </p>

              <div className="rounded-xl border border-border bg-white p-6">
                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Promo Text
                    <input
                      type="text"
                      value={promoText}
                      onChange={(e) => setPromoText(e.target.value)}
                      placeholder="🚚 Free Shipping Over $200"
                      maxLength={100}
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-slate-500">
                      The text that will be displayed in the promotional banner
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoVisible}
                      onChange={(e) => setPromoVisible(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
                      disabled={!canEdit}
                    />
                    <span className="text-sm font-medium text-slate-700">Show promo banner</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.section>
        ) : section === 'sections' ? (
          <motion.section
            key="sections"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                  <span className="flex items-center gap-2">
                    Sections
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                      {sections.length}/{MAX_SECTIONS}
                    </span>
                  </span>
                </span>

                <button
                  type="button"
                  onClick={addSection}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-dashed border-primary bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10',
                    (sections.length >= MAX_SECTIONS || !canEdit) && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={sections.length >= MAX_SECTIONS || !canEdit}
                >
                  <Plus className="h-4 w-4" />
                  Add section
                </button>
              </div>
            </div>

            {!sections.length && (
              <p className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
                No sections yet. Click "Add section" to create one.
              </p>
            )}

            <div className="space-y-4">
              {sections.map((s, sectionIndex) => {
                const IconPreview = ICON_OPTIONS.find((opt) => opt.value === s.icon)?.icon ?? Sparkles;
                const isEditing = editingSectionId === s.id;

                return (
                  <article
                    key={s.id ?? `section-${sectionIndex}`}
                    className={cn(
                      'relative rounded-2xl border border-border bg-white p-4 shadow-sm transition',
                      isEditing ? 'border-primary shadow-md ring-2 ring-primary/10' : 'hover:border-primary hover:shadow-md'
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-red-100">
                        <IconPreview className="h-8 w-8 text-red-600" />
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-900">
                              {s.name?.trim() || 'Untitled section'}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              {(s.items ?? []).length} {(s.items ?? []).length === 1 ? 'category' : 'categories'} assigned
                            </p>
                          </div>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Order #{s.order ?? sectionIndex}
                          </span>
                        </div>

                        <div className="mt-auto flex flex-wrap justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveSection}
                                disabled={saving || !s.name.trim()}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectionId(null)}
                                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300"
                              >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingSectionId(s.id!)}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
                              >
                                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSection(sectionIndex)}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px]">
                          <label className="flex flex-col gap-2 text-sm text-slate-600">
                            Name
                            <input
                              type="text"
                              value={s.name}
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
                              value={s.icon}
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
                              value={s.order ?? sectionIndex}
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
                            {(s.items ?? []).map((item, itemIndex) => (
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
                            {!(s.items ?? []).length && (
                              <p className="rounded-lg border border-dashed border-border bg-white px-3 py-2 text-xs text-muted">
                                No categories assigned yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </motion.section>
        ) : section === 'quicklinks' ? (
          <motion.section
            key="quicklinks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                  <span className="flex items-center gap-2">
                    Quick links
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                      {links.length}/{MAX_QUICK_LINKS}
                    </span>
                  </span>
                </span>

                <button
                  type="button"
                  onClick={addLink}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-dashed border-primary bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10',
                    (links.length >= MAX_QUICK_LINKS || !canEdit) && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={!canEdit || links.length >= MAX_QUICK_LINKS}
                >
                  <Plus className="h-4 w-4" />
                  Add link
                </button>
              </div>
            </div>

            {!links.length && (
              <p className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
                No quick links yet. Click "Add link" to create one.
              </p>
            )}

            <div className="space-y-4">
              {links.map((link, index) => {
                const isEditing = editingLinkId === link.id;

                return (
                  <article
                    key={link.id ?? `link-${index}`}
                    className={cn(
                      'relative rounded-2xl border border-border bg-white p-4 shadow-sm transition',
                      isEditing ? 'border-primary shadow-md ring-2 ring-primary/10' : 'hover:border-primary hover:shadow-md'
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                        <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-slate-900">
                              {link.label?.trim() || 'Untitled link'}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">{link.href || 'No URL set'}</p>
                          </div>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Order #{link.order ?? index}
                          </span>
                        </div>

                        <div className="mt-auto flex flex-wrap justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveLink}
                                disabled={saving || !link.label.trim() || !link.href.trim()}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLinkId(null)}
                                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300"
                              >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingLinkId(link.id!)}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
                              >
                                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeLink(index)}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                          <label className="flex flex-col gap-2 text-sm text-slate-600">
                            Label
                            <input
                              type="text"
                              value={link.label}
                              maxLength={32}
                              onChange={(event) =>
                                updateLink(index, (prev) => ({ ...prev, label: event.target.value }))
                              }
                              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              disabled={!canEdit}
                              required
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-600">
                            URL
                            <input
                              type="text"
                              value={link.href}
                              onChange={(event) =>
                                updateLink(index, (prev) => ({ ...prev, href: event.target.value }))
                              }
                              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              disabled={!canEdit}
                              required
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm text-slate-600">
                            Order
                            <input
                              type="number"
                              value={link.order ?? index}
                              onChange={(event) =>
                                updateLink(index, (prev) => ({ ...prev, order: Number(event.target.value) }))
                              }
                              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              disabled={!canEdit}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="visible"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                  <span className="flex items-center gap-2">
                    Visible titles
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                      {visibleCount}/{MAX_VISIBLE_ITEMS}
                    </span>
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={onSave}
                disabled={saving || !canEdit}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70',
                  !canEdit && 'pointer-events-none opacity-50'
                )}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save navigation'}
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Select up to {MAX_VISIBLE_ITEMS} items to display in the navigation menu.
            </p>

            {!allItems.length && (
              <p className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
                No sections or quick links created yet. Create them first to make them visible.
              </p>
            )}

            <div className="space-y-2">
              {allItems.map((item) => {
                const isChecked = item.visible;
                const isDisabled = !isChecked && visibleCount >= MAX_VISIBLE_ITEMS;

                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border bg-white p-4 cursor-pointer transition hover:bg-slate-50',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      isChecked && 'border-primary bg-primary/5'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVisibleItem(item)}
                      disabled={!canEdit || isDisabled}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      {item.type === 'section' ? (
                        <>
                          <item.icon className="h-5 w-5 text-red-600 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{item.label}</span>
                            <span className="text-xs text-slate-500">Section</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-5 w-5 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{item.label}</span>
                            <span className="text-xs text-slate-500">Quick link • {item.href}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
