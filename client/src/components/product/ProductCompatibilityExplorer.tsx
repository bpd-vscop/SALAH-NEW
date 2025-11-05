import { useMemo, useState } from 'react';
import type { ProductCompatibilityEntry } from '../../types/api';

interface ProductCompatibilityExplorerProps {
  entries?: ProductCompatibilityEntry[];
}

interface ResolvedCompatibility {
  year?: number;
  make: string;
  model: string;
  subModel?: string;
  engine?: string;
  notes?: string;
}

const resolveEntries = (entries?: ProductCompatibilityEntry[]): ResolvedCompatibility[] => {
  if (!Array.isArray(entries)) return [];

  const resolved: ResolvedCompatibility[] = [];

  entries.forEach((entry) => {
    const { yearStart, yearEnd, year, make, model, subModel, engine, notes } = entry;
    if (year) {
      resolved.push({ year, make, model, subModel, engine, notes });
      return;
    }

    if (yearStart && yearEnd && yearEnd >= yearStart) {
      for (let y = yearStart; y <= yearEnd; y += 1) {
        resolved.push({ year: y, make, model, subModel, engine, notes });
      }
      return;
    }

    if (yearStart && !yearEnd) {
      resolved.push({ year: yearStart, make, model, subModel, engine, notes });
      return;
    }

    resolved.push({ make, model, subModel, engine, notes });
  });

  return resolved;
};

export const ProductCompatibilityExplorer: React.FC<ProductCompatibilityExplorerProps> = ({ entries }) => {
  const compatibility = useMemo(() => resolveEntries(entries), [entries]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const filteredByYear = useMemo(() => {
    if (!selectedYear) return compatibility;
    return compatibility.filter((item) => String(item.year ?? '') === selectedYear);
  }, [compatibility, selectedYear]);

  const filteredByMake = useMemo(() => {
    if (!selectedMake) return filteredByYear;
    return filteredByYear.filter((item) => item.make === selectedMake);
  }, [filteredByYear, selectedMake]);

  const filteredByModel = useMemo(() => {
    if (!selectedModel) return filteredByMake;
    return filteredByMake.filter((item) => item.model === selectedModel);
  }, [filteredByMake, selectedModel]);

  const years = useMemo(() => {
    const set = new Set<string>();
    compatibility.forEach((item) => {
      if (typeof item.year === 'number') set.add(String(item.year));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [compatibility]);

  const makes = useMemo(() => {
    const set = new Set<string>();
    filteredByYear.forEach((item) => set.add(item.make));
    return Array.from(set).sort();
  }, [filteredByYear]);

  const models = useMemo(() => {
    const set = new Set<string>();
    filteredByMake.forEach((item) => set.add(item.model));
    return Array.from(set).sort();
  }, [filteredByMake]);

  const hasSelection = Boolean(selectedYear || selectedMake || selectedModel);
  const matches = filteredByModel;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Year
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Any</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Make
            <select
              value={selectedMake}
              onChange={(event) => setSelectedMake(event.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!makes.length}
            >
              <option value="">Any</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Model
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!models.length}
            >
              <option value="">Any</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasSelection ? (
          <button
            type="button"
            onClick={() => {
              setSelectedYear('');
              setSelectedMake('');
              setSelectedModel('');
            }}
            className="mt-3 text-xs font-medium text-primary underline-offset-2 transition hover:underline"
          >
            Clear selection
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-medium text-slate-900">
            {matches.length
              ? `Compatible with ${matches.length} vehicle${matches.length === 1 ? '' : 's'}.`
              : 'No vehicles match the current selection.'}
          </p>
          {entries?.length ? (
            <span className="text-xs uppercase tracking-wide text-muted">
              Total fitments: {entries.length}
            </span>
          ) : null}
        </div>
        {matches.length ? (
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Make</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {matches.map((item, index) => (
                  <tr key={`${item.make}-${item.model}-${item.year ?? 'any'}-${index}`} className="bg-white/80">
                    <td className="px-4 py-3 text-slate-700">{item.year ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.make}</td>
                    <td className="px-4 py-3 text-slate-700">{item.model}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.subModel || item.engine || item.notes ? (
                        <div className="space-y-1 text-xs">
                          {item.subModel && <div>Trim: <span className="font-medium text-slate-800">{item.subModel}</span></div>}
                          {item.engine && <div>Engine: <span className="font-medium text-slate-800">{item.engine}</span></div>}
                          {item.notes && <div className="text-slate-500">{item.notes}</div>}
                        </div>
                      ) : (
                        <span className="text-muted">Standard fit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
            Adjust the filters to see compatible vehicles or contact support to confirm fitment.
          </div>
        )}
        {entries?.length ? (
          <p className="text-xs text-muted">
            Compatibility data is provided for guidance. Always confirm fitment before ordering.
          </p>
        ) : null}
      </div>
    </div>
  );
};
