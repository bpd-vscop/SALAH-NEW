import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { cn } from '../../utils/cn';
import type { FeaturedShowcaseItem, FeaturedVariant } from '../../api/featuredShowcase';
import type { HeroSlide } from '../../api/heroSlides';
import {
  type FeatureFormState,
  type HeroSlideFormState,
  type OrderConflictState,
  type StatusSetter,
} from './types';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Unsupported file result'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

interface HomepageAdminSectionProps {
  section: 'hero' | 'featured';
  onSectionChange: (section: 'hero' | 'featured') => void;
  sortedHeroSlides: HeroSlide[];
  selectedHeroSlideId: string;
  onSelectHeroSlide: (id: string) => void;
  heroForm: HeroSlideFormState;
  setHeroForm: Dispatch<SetStateAction<HeroSlideFormState>>;
  onHeroSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  requestDeleteHero: (id: string) => void;
  canEditHomepage: boolean;
  canDeleteHomepage: boolean;
  featuredByVariant: { feature: FeaturedShowcaseItem[]; tiles: FeaturedShowcaseItem[] };
  activeFeatureTab: FeaturedVariant;
  onFeatureTabChange: (tab: FeaturedVariant) => void;
  selectedFeatureId: string;
  onSelectFeature: (id: string) => void;
  featureForm: FeatureFormState;
  setFeatureForm: Dispatch<SetStateAction<FeatureFormState>>;
  onFeatureSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  requestDeleteFeatured: (id: string) => void;
  orderConflict: OrderConflictState;
  setOrderConflict: Dispatch<SetStateAction<OrderConflictState>>;
  setStatus: StatusSetter;
  maxImageBytes: number;
}

export const HomepageAdminSection: React.FC<HomepageAdminSectionProps> = ({
  section,
  onSectionChange,
  sortedHeroSlides,
  selectedHeroSlideId,
  onSelectHeroSlide,
  heroForm,
  setHeroForm,
  onHeroSubmit,
  requestDeleteHero,
  canEditHomepage,
  canDeleteHomepage,
  featuredByVariant,
  activeFeatureTab,
  onFeatureTabChange,
  selectedFeatureId,
  onSelectFeature,
  featureForm,
  setFeatureForm,
  onFeatureSubmit,
  requestDeleteFeatured,
  orderConflict,
  setOrderConflict,
  setStatus,
  maxImageBytes,
}) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSectionChange('hero')}
        className={cn(
          'rounded-xl border px-4 py-2 text-xs font-semibold transition',
          section === 'hero'
            ? 'border-primary bg-primary text-white shadow-sm'
            : 'border-border text-slate-600 hover:bg-primary/10 hover:text-primary'
        )}
      >
        Hero slider
      </button>
      <button
        type="button"
        onClick={() => onSectionChange('featured')}
        className={cn(
          'rounded-xl border px-4 py-2 text-xs font-semibold transition',
          section === 'featured'
            ? 'border-primary bg-primary text-white shadow-sm'
            : 'border-border text-slate-600 hover:bg-primary/10 hover:text-primary'
        )}
      >
        Featured highlights
      </button>
    </div>

    {section === 'hero' ? (
      <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-900">Hero Slider</h2>
          <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
            <span className="flex items-center gap-2">
              Slides
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                {sortedHeroSlides.length}/5
              </span>
            </span>
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            {sortedHeroSlides.map((slide) => (
              <article
                key={slide.id}
                className={cn(
                  'rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                  selectedHeroSlideId === slide.id && 'border-primary bg-white shadow-md'
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-slate-900">{slide.title}</h3>
                    {slide.subtitle && <p className="text-sm text-muted">{slide.subtitle}</p>}
                    <p className="text-xs text-muted">Order {slide.order ?? 0}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      onClick={() => onSelectHeroSlide(slide.id)}
                    >
                      Edit
                    </button>
                    {canDeleteHomepage && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        onClick={() => requestDeleteHero(slide.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!sortedHeroSlides.length && (
              <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                No hero slides yet.
              </p>
            )}
          </div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={onHeroSubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedHeroSlideId ? 'Update hero slide' : 'Create hero slide'}
              </h3>
              <p className="text-xs text-muted">Upload desktop and mobile artwork for up to three slides.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Title
              <input
                type="text"
                value={heroForm.title}
                onChange={(event) => setHeroForm((state) => ({ ...state, title: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Subtitle
              <input
                type="text"
                value={heroForm.subtitle}
                onChange={(event) => setHeroForm((state) => ({ ...state, subtitle: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Caption
              <textarea
                value={heroForm.caption}
                onChange={(event) => setHeroForm((state) => ({ ...state, caption: event.target.value }))}
                rows={3}
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              CTA label
              <input
                type="text"
                value={heroForm.ctaText}
                onChange={(event) => setHeroForm((state) => ({ ...state, ctaText: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Link URL
              <input
                type="url"
                value={heroForm.linkUrl}
                onChange={(event) => setHeroForm((state) => ({ ...state, linkUrl: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Display order
              <input
                type="number"
                min={0}
                value={heroForm.order}
                onChange={(event) => setHeroForm((state) => ({ ...state, order: Number(event.target.value) || 0 }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Alt text
              <input
                type="text"
                value={heroForm.altText}
                onChange={(event) => setHeroForm((state) => ({ ...state, altText: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    heroForm.desktopImage
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-red-200 bg-red-100 text-red-700'
                  )}
                >
                  <span>{heroForm.desktopImage ? 'Replace desktop image' : 'Upload desktop image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        if (file.size > maxImageBytes) {
                          setStatus(null, `Desktop image must be ${Math.round(maxImageBytes / (1024 * 1024))} MB or smaller.`);
                          event.target.value = '';
                          return;
                        }
                        const dataUrl = await fileToDataUrl(file);
                        setHeroForm((state) => ({ ...state, desktopImage: dataUrl }));
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                {heroForm.desktopImage && (
                  <img src={heroForm.desktopImage} alt="Desktop preview" className="h-32 w-full rounded-xl object-cover" />
                )}
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    heroForm.mobileImage
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-red-200 bg-red-100 text-red-700'
                  )}
                >
                  <span>{heroForm.mobileImage ? 'Replace mobile image' : 'Upload mobile image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        if (file.size > maxImageBytes) {
                          setStatus(null, `Mobile image must be ${Math.round(maxImageBytes / (1024 * 1024))} MB or smaller.`);
                          event.target.value = '';
                          return;
                        }
                        const dataUrl = await fileToDataUrl(file);
                        setHeroForm((state) => ({ ...state, mobileImage: dataUrl }));
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                {heroForm.mobileImage && (
                  <img src={heroForm.mobileImage} alt="Mobile preview" className="h-32 w-full rounded-xl object-cover" />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!canEditHomepage}
              >
                {selectedHeroSlideId ? 'Save changes' : 'Create slide'}
              </button>
              {selectedHeroSlideId && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                  onClick={() => onSelectHeroSlide('')}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    ) : (
      <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Feature cards: {featuredByVariant.feature.length} / 3 · Tiles: {featuredByVariant.tiles.length} / 4
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {(['feature', 'tile'] as FeaturedVariant[]).map((tab) => {
            const selected = activeFeatureTab === tab;
            return (
              <button
                type="button"
                key={tab}
                onClick={() => onFeatureTabChange(tab)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-xs font-semibold transition',
                  selected
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border text-slate-600 hover:bg-primary/10 hover:text-primary'
                )}
              >
                {tab === 'feature' ? 'Feature cards' : 'Tile cards'}
              </button>
            );
          })}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            {(activeFeatureTab === 'feature' ? featuredByVariant.feature : featuredByVariant.tiles).map((item) => (
              <article
                key={item.id}
                className={cn(
                  'relative flex flex-col gap-4 rounded-3xl border border-border bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:border-primary/60 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]',
                  selectedFeatureId === item.id && 'border-primary bg-white shadow-[0_28px_80px_rgba(177,33,33,0.24)]'
                )}
              >
                <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-900/10">
                  <img src={item.image} alt={item.altText || item.title} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                  {activeFeatureTab === 'feature' ? (
                    <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                      Desktop &amp; mobile
                    </span>
                  ) : (
                    item.badgeText && (
                      <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                        {item.badgeText}
                      </span>
                    )
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-muted">Order {item.order ?? 0}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => onSelectFeature(item.id)}
                  >
                    Edit
                  </button>
                  {canDeleteHomepage && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      onClick={() => requestDeleteFeatured(item.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
            {(activeFeatureTab === 'feature' ? featuredByVariant.feature : featuredByVariant.tiles).length === 0 && (
              <p className="rounded-3xl border border-dashed border-border bg-white/70 px-4 py-6 text-center text-sm text-muted">
                No {activeFeatureTab === 'feature' ? 'feature cards' : 'tile cards'} yet.
              </p>
            )}
            {orderConflict && orderConflict.type === 'featured' && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-md">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900">Order Conflict</h4>
                    <p className="mt-1 text-sm text-amber-800">
                      Order {orderConflict.order} is already used by "{orderConflict.existingTitle}". Do you want to continue? This may affect the display order.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderConflict(null)}
                    className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => orderConflict.onConfirm()}
                    className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>
            )}
          </div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={onFeatureSubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedFeatureId ? 'Update featured item' : 'Create featured item'}
              </h3>
              <p className="text-xs text-muted">Uploads are stored as base64. The last three per variant are kept.</p>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Managing: {activeFeatureTab === 'feature' ? 'Feature cards' : 'Tile cards'}
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Title
              <input
                type="text"
                value={featureForm.title}
                onChange={(event) => setFeatureForm((state) => ({ ...state, title: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Subtitle
              <input
                type="text"
                value={featureForm.subtitle}
                onChange={(event) => setFeatureForm((state) => ({ ...state, subtitle: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Category label
                <input
                  type="text"
                  value={featureForm.category}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, category: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Offer text
                <input
                  type="text"
                  value={featureForm.offer}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, offer: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Badge text
                <input
                  type="text"
                  value={featureForm.badgeText}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, badgeText: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                CTA label
                <input
                  type="text"
                  value={featureForm.ctaText}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, ctaText: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Link URL
                <input
                  type="url"
                  value={featureForm.linkUrl}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, linkUrl: event.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Price text
                <input
                  type="text"
                  value={featureForm.price}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, price: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Alt text
              <input
                type="text"
                value={featureForm.altText}
                onChange={(event) => setFeatureForm((state) => ({ ...state, altText: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Display order
              <input
                type="number"
                min={0}
                value={featureForm.order}
                onChange={(event) => setFeatureForm((state) => ({ ...state, order: Number(event.target.value) || 0 }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                  featureForm.image
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-red-200 bg-red-100 text-red-700'
                )}
              >
                <span>{featureForm.image ? 'Replace image' : 'Upload image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      if (file.size > maxImageBytes) {
                        setStatus(null, `Image must be ${Math.round(maxImageBytes / (1024 * 1024))} MB or smaller.`);
                        event.target.value = '';
                        return;
                      }
                      const dataUrl = await fileToDataUrl(file);
                      setFeatureForm((state) => ({ ...state, image: dataUrl }));
                    }
                  }}
                  className="sr-only"
                />
              </label>
              {featureForm.image && (
                <img src={featureForm.image} alt="Feature preview" className="h-32 w-full rounded-xl object-cover" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!canEditHomepage}
              >
                {selectedFeatureId ? 'Save changes' : 'Create item'}
              </button>
              {selectedFeatureId && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                  onClick={() => onSelectFeature('')}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    )}
  </div>
);
