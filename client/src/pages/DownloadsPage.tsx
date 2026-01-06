import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadsApi } from '../api/downloads';
import type { DownloadEntry } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';

export const DownloadsPage: React.FC = () => {
  const [items, setItems] = useState<DownloadEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { downloads } = await downloadsApi.list();
        setItems(downloads);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load downloads');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const sorted = useMemo(() => items.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')), [items]);

  return (
    <SiteLayout>
      <section className="mx-auto w-[88%] space-y-6 py-8">
        <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
          <span className="text-xs uppercase tracking-[0.3em] text-white/70">Downloads</span>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Downloadables</h1>
          <p className="mt-2 text-sm text-white/80">Find the latest firmware, tools, and guides.</p>
        </div>
      </section>

      <section className="mx-auto w-[88%] pb-16">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">All downloads</h2>
            <p className="text-sm text-muted">Showing {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}</p>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Loading downloads...
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((entry) => (
            <Link
              key={entry.id}
              to={`/downloads/${entry.slug}`}
              className="group flex flex-col items-center rounded-xl border border-border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-slate-50 p-4">
                {entry.image ? (
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="h-auto w-full object-contain transition duration-300 group-hover:scale-[1.05]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500">
                    No image
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v10m0 0l4-4m-4 4l-4-4M5 19h14" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 w-full text-center">
                <h3 className="text-xs font-semibold text-slate-900">{entry.name}</h3>
              </div>
            </Link>
          ))}
          {!loading && !sorted.length && (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No downloads available yet.
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};
