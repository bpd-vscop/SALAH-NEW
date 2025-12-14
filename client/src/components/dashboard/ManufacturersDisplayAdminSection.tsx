import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { cn } from '../../utils/cn';
import { manufacturersApi, type Manufacturer } from '../../api/manufacturers';
import { manufacturerDisplayApi } from '../../api/manufacturerDisplay';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
const FALLBACK_COLORS = ['#f97316', '#ef4444', '#6366f1', '#0ea5e9', '#10b981', '#facc15'];

interface ManufacturersDisplayAdminSectionProps {
  maxHomepageManufacturers: number;
  onOrderConflict: (order: number, existingTitle: string, onConfirm: () => void) => void;
  setStatus: (msg: string | null, err?: string | null) => void;
}

export const ManufacturersDisplayAdminSection: React.FC<ManufacturersDisplayAdminSectionProps> = ({
  maxHomepageManufacturers,
  onOrderConflict,
  setStatus,
}) => {
  const [list, setList] = useState<Manufacturer[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [selectedForOrder, setSelectedForOrder] = useState<string | null>(null);
  const [hero, setHero] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [{ manufacturers }, { settings }] = await Promise.all([
      manufacturersApi.list(),
      manufacturerDisplayApi.get(),
    ]);
    setList(manufacturers);
    const map: Record<number, string> = {};
    (settings.homepageManufacturers || []).slice(0, maxHomepageManufacturers).forEach((id, idx) => {
      if (id) map[idx + 1] = id;
    });
    setAssignments(map);
    setHero(settings.allManufacturersHeroImage || '');
  };

  useEffect(() => { void refresh(); }, []);

  const assignedOrders = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(assignments).forEach(([order, id]) => { if (id) map.set(id, Number(order)); });
    return map;
  }, [assignments]);

  const handleUpload = async (file: File | undefined, setter: Dispatch<SetStateAction<string>>) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert(`Image must be ${MAX_IMAGE_MB} MB or smaller.`);
      return;
    }
    try {
      const uploadedPath = await manufacturerDisplayApi.uploadHeroImage(file);
      setter(uploadedPath);
    } catch (e) {
      console.error(e);
      window.alert('Failed to upload image file. Please try again.');
    }
  };

  const handleOrderChange = (manufacturerId: string, rawOrder: string) => {
    setAssignments((state) => {
      const current: Record<number, string> = { ...state };
      // remove existing assignment for this manufacturer
      Object.keys(current).forEach((order) => {
        if (current[Number(order)] === manufacturerId) delete current[Number(order)];
      });

      const trimmed = rawOrder.trim();
      if (!trimmed) return current;
      const nextOrder = Number(trimmed);
      if (!Number.isFinite(nextOrder) || nextOrder < 1 || nextOrder > maxHomepageManufacturers) return current;

      const existingId = current[nextOrder];
      if (existingId && existingId !== manufacturerId) {
        const existing = list.find((m) => m.id === existingId)?.name ?? 'another manufacturer';
        const onConfirm = () => {
          setAssignments((prev) => {
            const next: Record<number, string> = { ...prev };
            // remove current manufacturer elsewhere
            Object.keys(next).forEach((order) => {
              if (next[Number(order)] === manufacturerId) delete next[Number(order)];
            });
            // compute next available slot for displaced existingId
            const used = new Set<number>(Object.keys(next).map((k) => Number(k)));
            used.add(nextOrder);
            let candidate = 1; while (candidate <= maxHomepageManufacturers && used.has(candidate)) candidate++;
            if (candidate <= maxHomepageManufacturers) next[candidate] = existingId;
            // place current manufacturer in requested order
            next[nextOrder] = manufacturerId;
            return next;
          });
          setSelectedForOrder(null);
        };
        onOrderConflict(nextOrder, existing, onConfirm);
        return state;
      }

      return { ...current, [nextOrder]: manufacturerId };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const ordered: string[] = [];
      for (let i = 1; i <= maxHomepageManufacturers; i++) {
        ordered.push(assignments[i] ?? '');
      }
      const heroValue = hero.trim();
      const payload: { homepageManufacturers: string[]; allManufacturersHeroImage?: string | null } = {
        homepageManufacturers: ordered.filter(Boolean),
      };
      if (!heroValue) {
        payload.allManufacturersHeroImage = null;
      } else if (heroValue.startsWith('/uploads/')) {
        payload.allManufacturersHeroImage = heroValue;
      }
      await manufacturerDisplayApi.update(payload);
      setStatus('Display settings saved');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to update manufacturers display');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Manufacturers display</h2>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">All manufacturers hero image</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
            <label
              className={cn(
                'inline-flex w-fit cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition',
                hero ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'
              )}
            >
              <span>{hero ? 'Replace hero image' : `Upload hero image (max ${MAX_IMAGE_MB} MB)`}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  await handleUpload(file, setHero);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {hero && (
              <div className="flex flex-col gap-2">
                <img src={hero} alt="All manufacturers hero preview" className="h-40 w-full rounded-2xl border border-border object-cover" />
                <button
                  type="button"
                  className="w-fit rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                  onClick={() => setHero('')}
                >
                  Remove hero image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Homepage manufacturers</h3>
            <span className="text-xs text-muted">Click to assign order (1–{maxHomepageManufacturers})</span>
          </div>

          {!list.length ? (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No manufacturers available yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 lg:gap-8">
              {list.map((m, index) => {
                const fallbackColor = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                const assignedOrder = assignedOrders.get(m.id);
                const isSelected = selectedForOrder === m.id;
                return (
                  <div key={m.id} className="flex flex-col items-center text-center p-2">
                    <button
                      type="button"
                      onClick={() => setSelectedForOrder(isSelected ? null : m.id)}
                      className="group relative flex flex-col items-center rounded-lg p-2 transition-all duration-300 hover:bg-slate-50"
                    >
                      <div
                        className={cn(
                          'relative mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 bg-white transition-all duration-300',
                          isSelected
                            ? 'border-primary scale-110 shadow-lg'
                            : assignedOrder
                              ? 'border-emerald-500 group-hover:border-primary group-hover:scale-105'
                              : 'border-slate-200 group-hover:border-primary group-hover:scale-105'
                        )}
                      >
                        {m.logoImage ? (
                          <img src={m.logoImage} alt={m.name} className="absolute inset-0 m-auto h-full w-full scale-110 p-1 object-contain transition-transform duration-300 group-hover:scale-125" />
                        ) : (
                          <span
                            className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold text-white"
                            style={{ background: fallbackColor }}
                          >
                            {m.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {assignedOrder && (
                          <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">
                            {assignedOrder}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors duration-300',
                          isSelected ? 'text-primary' : assignedOrder ? 'text-emerald-600' : 'text-slate-700 group-hover:text-primary'
                        )}
                      >
                        {m.name}
                      </span>
                    </button>
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={maxHomepageManufacturers}
                          value={assignedOrder ?? ''}
                          placeholder="Order"
                          autoFocus
                          className="h-8 w-16 rounded-lg border-2 border-primary bg-white px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(event) => {
                            const value = event.target.value;
                            const numValue = Number(value);
                            if (value !== '' && numValue < 1) return;
                            handleOrderChange(m.id, value);
                            if (value) setSelectedForOrder(null);
                          }}
                          onBlur={() => setSelectedForOrder(null)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === 'Escape') setSelectedForOrder(null);
                            if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') event.preventDefault();
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => { void save(); }}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save display settings'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
