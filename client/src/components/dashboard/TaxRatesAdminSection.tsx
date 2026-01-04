import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { taxRatesApi } from '../../api/taxRates';
import { CountrySelect } from '../common/CountrySelect';
import { cn } from '../../utils/cn';
import type { TaxRate } from '../../types/api';
import type { StatusSetter } from './types';

interface TaxRatesAdminSectionProps {
  setStatus: StatusSetter;
}

interface TaxRateFormState {
  country: string;
  state: string;
  rate: string;
}

const emptyForm: TaxRateFormState = {
  country: 'United States',
  state: '',
  rate: '',
};

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

const formatRate = (value: number) => `${value}%`;

export const TaxRatesAdminSection: React.FC<TaxRatesAdminSectionProps> = ({ setStatus }) => {
  const [list, setList] = useState<TaxRate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<TaxRateFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = async () => {
    const { taxRates } = await taxRatesApi.list();
    setList(taxRates);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm);
      return;
    }
    const existing = list.find((rate) => rate.id === selectedId);
    if (existing) {
      setForm({
        country: existing.country ?? '',
        state: existing.state ?? '',
        rate: Number.isFinite(existing.rate) ? String(existing.rate) : '',
      });
    }
  }, [selectedId, list]);

  const filteredRates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;
    return list.filter((rate) => {
      const country = rate.country?.toLowerCase() ?? '';
      const state = rate.state?.toLowerCase() ?? '';
      return country.includes(query) || state.includes(query);
    });
  }, [list, searchQuery]);

  const isUnitedStates = useMemo(() => {
    return ['united states', 'united states of america'].includes(form.country.trim().toLowerCase());
  }, [form.country]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const country = form.country.trim();
    const state = form.state.trim();
    if (!country && !state) {
      setStatus(null, 'Select a country or state for the tax rate.');
      return;
    }
    const rate = Number.parseFloat(form.rate);
    if (!Number.isFinite(rate)) {
      setStatus(null, 'Tax rate must be a number.');
      return;
    }
    if (rate < 0 || rate > 100) {
      setStatus(null, 'Tax rate must be between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      if (selectedId) {
        await taxRatesApi.update(selectedId, {
          rate,
          country: country || null,
          state: state || null,
        });
        setStatus('Tax rate updated');
      } else {
        await taxRatesApi.create({
          rate,
          ...(country ? { country } : {}),
          ...(state ? { state } : {}),
        });
        setStatus('Tax rate created');
      }
      await refresh();
      setSelectedId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Tax rate operation failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await taxRatesApi.delete(deleteId);
      await refresh();
      setStatus('Tax rate deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete tax rate');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Tax rates</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[11fr_9fr]">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full sm:w-auto items-center gap-2">
              <input
                type="search"
                placeholder="Search by country or state"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-7 w-full sm:w-64 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="h-[520px] overflow-y-auto rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 text-slate-900">
                      {rate.country || 'All countries'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rate.state || 'All states'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatRate(rate.rate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(rate.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-slate-600 transition hover:border-primary hover:text-primary"
                          aria-label="Edit tax rate"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(rate.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                          aria-label="Delete tax rate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRates.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                      No tax rates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm" onSubmit={submit}>
          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Country
              <div className="flex items-center gap-2">
                <CountrySelect
                  value={form.country}
                  onChange={(value) => setForm((state) => ({ ...state, country: value }))}
                  className="flex-1"
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                  placement="auto"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              State
              <div className="flex items-center gap-2">
                {isUnitedStates ? (
                  <CountrySelect
                    value={form.state}
                    onChange={(value) => setForm((state) => ({ ...state, state: value }))}
                    options={US_STATES}
                    placeholder="Select state"
                    searchPlaceholder="Search states..."
                    placement="auto"
                    className="flex-1"
                  />
                ) : (
                  <input
                    type="text"
                    value={form.state}
                    onChange={(event) => setForm((state) => ({ ...state, state: event.target.value }))}
                    placeholder="State / Province"
                    className="h-7 flex-1 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {form.state && (
                  <button
                    type="button"
                    onClick={() => setForm((state) => ({ ...state, state: '' }))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-slate-500 transition hover:border-primary hover:text-primary"
                    aria-label="Clear state"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Tax rate (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.rate}
              onChange={(event) => setForm((state) => ({ ...state, rate: event.target.value }))}
              placeholder="0"
              className="h-7 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          <div className={cn('rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600')}>
            Add a country-only rate to apply tax across all states. Locations without a rate are 0% by default.
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
              disabled={loading}
            >
              {selectedId ? 'Save changes' : 'Create tax rate'}
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
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this tax rate?</p>
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
