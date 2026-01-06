import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import { manufacturerDisplayApi } from '../api/manufacturerDisplay';
import { SiteLayout } from '../components/layout/SiteLayout';

export const ManufacturersPage: React.FC = () => {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [heroImage, setHeroImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ manufacturers }, { settings }] = await Promise.all([
          manufacturersApi.list(),
          manufacturerDisplayApi.get(),
        ]);
        // unique by slug, active only
        const seen = new Set<string>();
        const unique = manufacturers
          .filter((m) => m.isActive !== false)
          .filter((m) => {
            if (seen.has(m.slug)) return false;
            seen.add(m.slug);
            return true;
          });
        // sort: order asc (0 last), then name
        unique.sort((a, b) => {
          const ao = a.order ?? 0; const bo = b.order ?? 0;
          if (ao === 0 && bo !== 0) return 1;
          if (bo === 0 && ao !== 0) return -1;
          if (ao !== bo) return ao - bo;
          return (a.name || '').localeCompare(b.name || '');
        });
        setItems(unique);
        setHeroImage(settings.allManufacturersHeroImage ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load manufacturers');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <SiteLayout>
      <section className="mx-auto w-[88%] space-y-6 py-8">
        {heroImage ? (
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
            <img src={heroImage} alt="All manufacturers hero" className="h-64 w-full object-cover md:h-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8 text-white md:p-12">
              <span className="text-xs uppercase tracking-[0.3em] text-white/80">Browse</span>
              <h1 className="text-3xl font-semibold md:text-4xl">All manufacturers</h1>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
            <span className="text-xs uppercase tracking-[0.3em] text-white/70">Browse</span>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">All manufacturers</h1>
          </div>
        )}
      
        <div className="mb-2" />
      </section>

      <section className="mx-auto w-[88%] pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Manufacturers directory</h2>
            <p className="text-sm text-muted">Select a brand to explore their compatible products and accessories.</p>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">Loading…</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Link
              key={m.id}
              to={`/products?manufacturerId=${m.id}`}
              className="flex items-center justify-center rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <img src={m.logoImage} alt={m.name} className="h-16 w-full object-contain" />
            </Link>
          ))}
          {!loading && !items.length && (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">No manufacturers yet.</div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};
