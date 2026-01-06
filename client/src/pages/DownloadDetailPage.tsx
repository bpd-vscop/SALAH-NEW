import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadsApi } from '../api/downloads';
import type { DownloadEntry } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';

export const DownloadDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [entry, setEntry] = useState<DownloadEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { download } = await downloadsApi.getBySlug(slug);
        setEntry(download);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load download');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  return (
    <SiteLayout>
      <section className="mx-auto mb-10 w-[88%] space-y-6 py-8">
        <div className="text-xs text-muted">
          <Link to="/" className="transition hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/downloads" className="font-medium text-slate-700 transition hover:text-primary">Downloads</Link>
          {entry && (
            <>
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900">{entry.name}</span>
            </>
          )}
        </div>

        {loading && (
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
        )}
        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && !entry && (
          <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted">
            Download not found.
          </div>
        )}

        {entry && (
          <div className="grid gap-6 lg:grid-cols-[30%_70%]">
            <div className="flex items-center justify-center overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-sm">
              {entry.image ? (
                <img src={entry.image} alt={entry.name} className="max-h-[400px] max-w-full rounded-2xl object-contain" />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500">
                  No image available
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-3xl border border-border bg-white/90 p-6 shadow-sm">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-muted">Download</span>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{entry.name}</h1>
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">
                  {entry.description || 'No description provided yet.'}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Files</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {entry.links.map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v10m0 0l4-4m-4 4l-4-4M5 19h14" />
                          </svg>
                        </span>
                        <span>{link.label || `Download ${index + 1}`}</span>
                      </div>
                      <span className="text-xs text-muted">Open</span>
                    </a>
                  ))}
                  {!entry.links.length && (
                    <p className="text-sm text-muted">No files linked yet.</p>
                  )}
                </div>
              </div>

              <Link
                to="/downloads"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Back to all downloads
              </Link>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
};
