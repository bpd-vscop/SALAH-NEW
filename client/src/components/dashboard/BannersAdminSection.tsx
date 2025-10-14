import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { StatusPill } from '../common/StatusPill';
import { cn } from '../../utils/cn';
import type { Banner, BannerType } from '../../types/api';
import type { BannerFormState } from './types';

interface BannersAdminSectionProps {
  banners: Banner[];
  selectedBannerId: string;
  onSelectBanner: (id: string) => void;
  form: BannerFormState;
  setForm: Dispatch<SetStateAction<BannerFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  bannerTypes: BannerType[];
}

export const BannersAdminSection: React.FC<BannersAdminSectionProps> = ({
  banners,
  selectedBannerId,
  onSelectBanner,
  form,
  setForm,
  onSubmit,
  onDelete,
  bannerTypes,
}) => (
  <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Banners</h2>
        <p className="text-sm text-muted">Manage promotional assets across the storefront.</p>
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {banners.map((banner) => (
          <article
            key={banner.id}
            className={cn(
              'rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary hover:shadow-md',
              selectedBannerId === banner.id && 'border-primary bg-white shadow-md'
            )}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">{banner.type}</span>
                  {banner.text && <p className="text-sm text-slate-700">{banner.text}</p>}
                </div>
                <StatusPill label={banner.isActive ? 'Active' : 'Hidden'} tone={banner.isActive ? 'positive' : 'warning'} />
              </div>
              <p className="text-xs text-muted">Order: {banner.order ?? 0}</p>
              {banner.linkUrl && (
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:text-primary-dark"
                >
                  {banner.linkUrl}
                </a>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  onClick={() => onSelectBanner(banner.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  onClick={() => void onDelete(banner.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
        {!banners.length && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
            No banners yet.
          </div>
        )}
      </div>
      <form
        className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">
            {selectedBannerId ? 'Update banner' : 'Create banner'}
          </h3>
          <p className="text-xs text-muted">Provide imagery, copy, and placement.</p>
        </div>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Type
          <select
            value={form.type}
            onChange={(event) => setForm((state) => ({ ...state, type: event.target.value as BannerType }))}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {bannerTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Image URL
          <input
            type="url"
            value={form.imageUrl}
            onChange={(event) => setForm((state) => ({ ...state, imageUrl: event.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Link URL
          <input
            type="url"
            value={form.linkUrl}
            onChange={(event) => setForm((state) => ({ ...state, linkUrl: event.target.value }))}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Text
          <textarea
            value={form.text}
            onChange={(event) => setForm((state) => ({ ...state, text: event.target.value }))}
            rows={3}
            className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Display order
          <input
            type="number"
            value={form.order}
            onChange={(event) => setForm((state) => ({ ...state, order: Number(event.target.value) }))}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((state) => ({ ...state, isActive: event.target.checked }))}
            className="h-4 w-4 rounded border border-border text-primary focus:ring-primary/30"
          />
          Active
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
        >
          {selectedBannerId ? 'Save changes' : 'Create banner'}
        </button>
        {selectedBannerId && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
            onClick={() => onSelectBanner('')}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  </section>
);

