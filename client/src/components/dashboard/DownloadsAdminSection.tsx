import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { downloadsApi, type DownloadPayload } from '../../api/downloads';
import type { DownloadEntry } from '../../types/api';
import { cn } from '../../utils/cn';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
const MAX_LINKS = 20;

const makeId = () => Math.random().toString(36).slice(2, 10);

interface DownloadLinkRow {
  id: string;
  label: string;
  url: string;
}

interface FormState {
  name: string;
  description: string;
  image: string;
  links: DownloadLinkRow[];
}

interface DownloadsAdminSectionProps {
  setStatus: (message: string | null, errorMessage?: string | null) => void;
}

const buildEmptyLinkRow = (): DownloadLinkRow => ({
  id: makeId(),
  label: '',
  url: '',
});

const buildEmptyForm = (): FormState => ({
  name: '',
  description: '',
  image: '',
  links: [buildEmptyLinkRow()],
});

export const DownloadsAdminSection: React.FC<DownloadsAdminSectionProps> = ({ setStatus }) => {
  const [list, setList] = useState<DownloadEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<FormState>(() => buildEmptyForm());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alphabetical'>('recent');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    const { downloads } = await downloadsApi.list();
    setList(downloads);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(buildEmptyForm());
      return;
    }

    const entry = list.find((item) => item.id === selectedId);
    if (!entry) {
      setForm(buildEmptyForm());
      return;
    }

    const mappedLinks =
      entry.links?.length
        ? entry.links.map((link) => ({
            id: makeId(),
            label: link.label ?? '',
            url: link.url ?? '',
          }))
        : [buildEmptyLinkRow()];

    setForm({
      name: entry.name ?? '',
      description: entry.description ?? '',
      image: entry.image ?? '',
      links: mappedLinks,
    });
  }, [selectedId, list]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let items = list;
    if (q) {
      items = items.filter((entry) => entry.name.toLowerCase().includes(q));
    }
    const copy = items.slice();
    if (sortOrder === 'alphabetical') {
      copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      copy.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
    }
    return copy;
  }, [list, searchQuery, sortOrder]);

  const linkLimitReached = form.links.length >= MAX_LINKS;
  const missingLinkUrl = form.links.some((link) => link.url.trim().length === 0);
  const canAddAnotherLink = !linkLimitReached && !missingLinkUrl;

  const addLink = () => {
    if (!canAddAnotherLink) {
      return;
    }
    setForm((state) => ({
      ...state,
      links: [...state.links, buildEmptyLinkRow()],
    }));
  };

  const updateLink = (id: string, field: 'label' | 'url', value: string) => {
    setForm((state) => ({
      ...state,
      links: state.links.map((link) => (link.id === id ? { ...link, [field]: value } : link)),
    }));
  };

  const removeLink = (id: string) => {
    setForm((state) => {
      if (state.links.length <= 1) {
        return state;
      }
      return {
        ...state,
        links: state.links.filter((link) => link.id !== id),
      };
    });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const normalizedLinks = form.links.map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }));

    if (normalizedLinks.some((link) => !link.url)) {
      setStatus(null, 'Please fill all download link URLs.');
      setLoading(false);
      return;
    }

    if (!normalizedLinks.length) {
      setStatus(null, 'At least one download link is required.');
      setLoading(false);
      return;
    }

    try {
      if (selectedId) {
        const existing = list.find((entry) => entry.id === selectedId);
        const payload: Partial<DownloadPayload> = {
          name: form.name.trim(),
          description: form.description.trim(),
          links: normalizedLinks,
        };

        if (form.image.startsWith('/uploads/')) {
          payload.image = form.image;
        } else if (existing?.image) {
          payload.image = null;
        }

        await downloadsApi.update(selectedId, payload);
        setStatus('Download updated');
      } else {
        const payload: DownloadPayload = {
          name: form.name.trim(),
          description: form.description.trim(),
          links: normalizedLinks,
        };

        if (form.image.startsWith('/uploads/')) {
          payload.image = form.image;
        }

        await downloadsApi.create(payload);
        setStatus('Download created');
      }

      await refresh();
      setSelectedId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Download operation failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await downloadsApi.delete(deleteId);
      await refresh();
      setStatus('Download deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete download');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Downloads</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortOrder('recent')}
                className={cn(
                  'rounded-lg px-2 py-1 text-[0.65rem] font-medium transition',
                  sortOrder === 'recent'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('alphabetical')}
                className={cn(
                  'rounded-lg px-2 py-1 text-[0.65rem] font-medium transition',
                  sortOrder === 'alphabetical'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                A-Z
              </button>
            </div>
            <label className="flex w-full items-center gap-2 sm:w-auto">
              <input
                type="search"
                placeholder="Search downloads"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
              />
            </label>
          </div>

          <div className="h-[520px] overflow-y-auto rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background/95 text-xs uppercase tracking-wide text-muted backdrop-blur">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Links</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredSorted.map((entry) => (
                  <tr key={entry.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.links?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.image ? (
                        <img src={entry.image} alt={entry.name} className="h-12 w-12 rounded-lg border border-border object-cover" />
                      ) : (
                        <span className="text-xs text-muted">No image</span>
                      )}
                    </td>
                    <td className="flex items-center justify-end gap-2 px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        onClick={() => setDeleteId(entry.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredSorted.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                      No downloads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={submit}>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Entry title
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))}
              required
              placeholder="e.g. Support Client"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((state) => ({ ...state, description: e.target.value }))}
              placeholder="Add details about the downloadable files."
              className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-medium">Image</span>
            <label
              className={cn(
                'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                form.image ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'
              )}
            >
              <span>
                {form.image ? `Replace image (max ${MAX_IMAGE_MB} MB)` : `Upload image (max ${MAX_IMAGE_MB} MB)`}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_IMAGE_BYTES) {
                    setStatus(null, 'Image is too large.');
                    event.currentTarget.value = '';
                    return;
                  }
                  try {
                    const uploadedPath = await downloadsApi.uploadImage(file);
                    setForm((state) => ({ ...state, image: uploadedPath }));
                  } catch (error) {
                    console.error('Failed to upload download image', error);
                    setStatus(null, error instanceof Error ? error.message : 'Unable to upload image');
                  }
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {form.image && (
              <div className="flex items-center gap-3">
                <img src={form.image} alt="Preview" className="h-16 w-16 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                  onClick={() => setForm((state) => ({ ...state, image: '' }))}
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Download links</span>
              <button
                type="button"
                onClick={addLink}
                disabled={!canAddAnotherLink}
                className={cn(
                  'text-xs font-semibold underline-offset-2',
                  canAddAnotherLink
                    ? 'text-primary hover:underline'
                    : 'cursor-not-allowed text-slate-300'
                )}
              >
                Add link
              </button>
            </div>

            {form.links.map((link, index) => (
              <div key={link.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                  placeholder={`Label ${index + 1} (optional)`}
                  className="h-9 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                  placeholder="https://..."
                  required
                  className="h-9 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  disabled={form.links.length <= 1}
                  className={cn(
                    'h-9 rounded-xl border px-3 text-sm transition',
                    form.links.length <= 1
                      ? 'cursor-not-allowed border-border text-muted'
                      : 'border-border text-muted hover:border-red-200 hover:text-red-600'
                  )}
                  aria-label="Remove link"
                >
                  Remove
                </button>
              </div>
            ))}
            {!canAddAnotherLink && (
              <p className="text-xs text-muted">
                {linkLimitReached
                  ? `You can add up to ${MAX_LINKS} links.`
                  : 'Fill the current link URL before adding another.'}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
              disabled={loading}
            >
              {selectedId ? 'Save changes' : 'Create entry'}
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
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this download?</p>
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
