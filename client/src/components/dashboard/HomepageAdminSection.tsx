import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  <div>
    {void orderConflict}
    {void setOrderConflict}
    <AnimatePresence mode="wait">
      {section === 'hero' ? (
        <motion.section
          key="hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
        <div className="flex justify-end">
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
                  'relative flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                  selectedHeroSlideId === slide.id && 'border-primary shadow-md ring-2 ring-primary/10'
                )}
              >
                <div className="relative grid w-80 flex-shrink-0 grid-cols-2 gap-2 overflow-hidden rounded-xl bg-slate-100">
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={slide.desktopImage} alt={`${slide.altText || slide.title} (Desktop)`} className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-red-500 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-white">
                      Desktop
                    </span>
                  </div>
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={slide.mobileImage} alt={`${slide.altText || slide.title} (Mobile)`} className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-red-500 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-white">
                      Mobile
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">{slide.title}</h3>
                        {slide.subtitle && <p className="mt-1 text-sm text-slate-600">{slide.subtitle}</p>}
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Order #{slide.order ?? 0}
                      </span>
                    </div>
                    {slide.caption && (
                      <p className="text-sm text-muted line-clamp-2">{slide.caption}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      {slide.ctaText && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          CTA: {slide.ctaText}
                        </span>
                      )}
                      {slide.linkUrl && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Link
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      onClick={() => onSelectHeroSlide(slide.id)}
                    >
                      <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    {canDeleteHomepage && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        onClick={() => requestDeleteHero(slide.id)}
                      >
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
            {/* Order conflict now handled in a global modal (AdminDashboardPage) for consistency */}
          </div>
          <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={onHeroSubmit}>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Title
              <input
                type="text"
                value={heroForm.title}
                onChange={(event) => setHeroForm((state) => ({ ...state, title: event.target.value }))}
                required
                placeholder="e.g. Spring Sale – Up to 50% Off"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Subtitle
              <input
                type="text"
                value={heroForm.subtitle}
                onChange={(event) => setHeroForm((state) => ({ ...state, subtitle: event.target.value }))}
                placeholder="Short supporting line (optional)"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Caption
              <textarea
                value={heroForm.caption}
                onChange={(event) => setHeroForm((state) => ({ ...state, caption: event.target.value }))}
                rows={3}
                placeholder="Optional descriptive paragraph"
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              CTA label
              <input
                type="text"
                value={heroForm.ctaText}
                onChange={(event) => setHeroForm((state) => ({ ...state, ctaText: event.target.value }))}
                placeholder="e.g. Shop Now"
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
                placeholder="https://example.com/products"
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
                placeholder="Accessible description of the images"
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
                  title="Upload desktop image (AR 21:6, max 5MB)"
                >
                  <span>{heroForm.desktopImage ? 'Replace desktop image' : 'Upload desktop image (AR 21:6 · max 5MB)'}</span>
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
                  title="Upload mobile image (AR 4:3, max 5MB)"
                >
                  <span>{heroForm.mobileImage ? 'Replace mobile image' : 'Upload mobile image (AR 4:3 · max 5MB)'}</span>
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
        </motion.section>
      ) : (
        <motion.section
          key="featured"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
        <div className="flex justify-end">
          <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
            <span className="flex items-center gap-2">
              Feature {featuredByVariant.feature.length}/3 · Tiles {featuredByVariant.tiles.length}/4
            </span>
          </span>
        </div>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeatureTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="space-y-4"
            >
            {(activeFeatureTab === 'feature' ? featuredByVariant.feature : featuredByVariant.tiles).map((item) => (
              <article
                key={item.id}
                className={cn(
                  'relative flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                  selectedFeatureId === item.id && 'border-primary shadow-md ring-2 ring-primary/10'
                )}
              >
                <div className="relative h-40 w-64 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <img src={item.image} alt={item.altText || item.title} className="absolute inset-0 h-full w-full object-cover" />
                  {activeFeatureTab === 'feature' ? (
                    <span className="absolute right-2 top-2 inline-flex items-center rounded-lg bg-blue-500 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Feature Card
                    </span>
                  ) : (
                    <span className="absolute right-2 top-2 inline-flex items-center rounded-lg bg-purple-500 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow-sm">
                      Tile Card
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                        {item.subtitle && <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>}
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Order #{item.order ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {item.category && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {item.category}
                        </span>
                      )}
                      {item.offer && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {item.offer}
                        </span>
                      )}
                      {item.price && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-700 font-semibold">
                          {item.price}
                        </span>
                      )}
                      {item.badgeText && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-purple-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    {item.ctaText && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        CTA: {item.ctaText}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      onClick={() => onSelectFeature(item.id)}
                    >
                      <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    {canDeleteHomepage && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        onClick={() => requestDeleteFeatured(item.id)}
                      >
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {(activeFeatureTab === 'feature' ? featuredByVariant.feature : featuredByVariant.tiles).length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                No {activeFeatureTab === 'feature' ? 'feature cards' : 'tile cards'} yet.
              </p>
            )}
            {/* Order conflict now handled in a global modal (AdminDashboardPage) for consistency */}
            </motion.div>
          </AnimatePresence>
          <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={onFeatureSubmit}>
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
                placeholder={activeFeatureTab === 'feature' ? 'e.g. Premium Key Programmer' : 'e.g. New Arrival'}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Subtitle
              <input
                type="text"
                value={featureForm.subtitle}
                onChange={(event) => setFeatureForm((state) => ({ ...state, subtitle: event.target.value }))}
                placeholder="Optional supporting text"
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
                  placeholder="e.g. Accessories"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Offer text
                <input
                  type="text"
                  value={featureForm.offer}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, offer: event.target.value }))}
                  placeholder="e.g. Save 20%"
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
                  placeholder="e.g. HOT"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                CTA label
                <input
                  type="text"
                  value={featureForm.ctaText}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, ctaText: event.target.value }))}
                  placeholder="e.g. Shop Now"
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
                  placeholder="https://example.com/collections/accessories"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Price text
                <input
                  type="text"
                  value={featureForm.price}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, price: event.target.value }))}
                  placeholder="e.g. From $199"
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
                placeholder="Accessible description of the image"
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
                title="Upload image (AR 1:1, max 5MB)"
              >
                <span>{featureForm.image ? 'Replace image' : 'Upload image (AR 1:1 · max 5MB)'}</span>
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
        </motion.section>
      )}
    </AnimatePresence>
  </div>
);
