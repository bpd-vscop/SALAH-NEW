import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { brandsApi, type Brand } from '../../api/brands';
import { cn } from '../../utils/cn';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

interface FormState {
  name: string;
  logoImage: string;
}

interface BrandsAdminSectionProps {
  onOrderConflict: (order: number, existingTitle: string, onConfirm: () => void) => void;
  setStatus: (msg: string | null, err?: string | null) => void;
}

export const BrandsAdminSection: React.FC<BrandsAdminSectionProps> = ({ onOrderConflict: _unusedOrderConflict, setStatus }) => {
  const [list, setList] = useState<Brand[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<FormState>({ name: '', logoImage: '' });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alphabetical'>('recent');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    const { brands } = await brandsApi.list();
    setList(brands);
  };

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm({ name: '', logoImage: '' });
      return;
    }
    const existing = list.find((b) => b.id === selectedId);
    if (existing) {
      setForm({ name: existing.name, logoImage: existing.logoImage });
    }
  }, [selectedId, list]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let l = list;
    if (q) l = l.filter((b) => b.name.toLowerCase().includes(q));
    const copy = l.slice();
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

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (selectedId) {
        const payload: Partial<Brand> = { name: form.name };
        if (form.logoImage.startsWith('/uploads/')) {
          payload.logoImage = form.logoImage;
        }
        await brandsApi.update(selectedId, payload);
        setStatus('Brand updated');
      } else {
        if (!form.logoImage.startsWith('/uploads/')) {
          setStatus(null, 'Please upload a logo image before creating the brand.');
          return;
        }
        await brandsApi.create({ name: form.name, logoImage: form.logoImage });
        setStatus('Brand created');
      }
      await refresh();
      setSelectedId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await brandsApi.delete(deleteId);
      await refresh();
      setStatus('Brand deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete brand');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Brands</h2>
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
                  sortOrder === 'recent' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('alphabetical')}
                className={cn(
                  'rounded-lg px-2 py-1 text-[0.65rem] font-medium transition',
                  sortOrder === 'alphabetical' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                A-Z
              </button>
            </div>
            <label className="flex w-full sm:w-auto items-center gap-2">
              <input
                type="search"
                placeholder="Search brands"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full sm:w-64 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="h-[520px] overflow-y-auto rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Logo</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredSorted.map((b) => (
                  <tr key={b.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {b.logoImage ? (
                        <img src={b.logoImage} alt={b.name} className="h-12 w-12 rounded-full border border-border object-cover" />
                      ) : (
                        <span className="text-xs text-muted">No logo</span>
                      )}
                    </td>
                    <td className="flex items-center justify-end gap-2 px-4 py-3">
                      <button type="button" className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary" onClick={() => setSelectedId(b.id)}>Edit</button>
                      <button type="button" className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50" onClick={() => setDeleteId(b.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!filteredSorted.length && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">No brands found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={submit}>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Name
            <input type="text" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required placeholder="e.g. Bosch" className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </label>
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-medium">Logo</span>
            <label
              className={cn(
                'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                form.logoImage ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-red-200 bg-red-100 text-red-700'
              )}
            >
              <span>{form.logoImage ? `Replace logo (max ${MAX_IMAGE_MB} MB)` : `Upload logo (max ${MAX_IMAGE_MB} MB)`}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (event) => {
                    const f = event.target.files?.[0];
                    if (!f) return;
                    if (f.size > MAX_IMAGE_BYTES) return alert('File too large');
                    try {
                      const uploadedPath = await brandsApi.uploadLogo(f);
                      setForm((s) => ({ ...s, logoImage: uploadedPath }));
                    } catch (error) {
                      console.error('Failed to upload brand logo', error);
                      setStatus(null, error instanceof Error ? error.message : 'Unable to upload brand logo');
                    }
                    event.currentTarget.value = '';
                  }}
                />
            </label>
            {form.logoImage && (
              <div className="flex items-center gap-3">
                <img src={form.logoImage} alt="Logo preview" className="h-16 w-16 rounded-full border border-border object-cover" />
                <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary" onClick={() => setForm((s) => ({ ...s, logoImage: '' }))}>Remove logo</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark" disabled={loading}>{selectedId ? 'Save changes' : 'Create brand'}</button>
            {selectedId && (
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:border-primary hover:text-primary" onClick={() => setSelectedId('')}>Cancel</button>
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
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this brand?</p>
                <p className="mt-2 text-sm font-semibold text-red-600">⚠️ This is a hard delete and cannot be recovered.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => void confirmDelete()} className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/20">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
