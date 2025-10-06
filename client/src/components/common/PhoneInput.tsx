import { useEffect, useMemo, useRef, useState } from 'react';

type Country = { code: string; name: string };

const COUNTRIES: Country[] = [
  { code: '+1', name: 'United States' },
  { code: '+1', name: 'Canada' },
  { code: '+20', name: 'Egypt' },
  { code: '+27', name: 'South Africa' },
  { code: '+30', name: 'Greece' },
  { code: '+31', name: 'Netherlands' },
  { code: '+32', name: 'Belgium' },
  { code: '+33', name: 'France' },
  { code: '+34', name: 'Spain' },
  { code: '+39', name: 'Italy' },
  { code: '+40', name: 'Romania' },
  { code: '+41', name: 'Switzerland' },
  { code: '+43', name: 'Austria' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+45', name: 'Denmark' },
  { code: '+46', name: 'Sweden' },
  { code: '+47', name: 'Norway' },
  { code: '+48', name: 'Poland' },
  { code: '+49', name: 'Germany' },
  { code: '+52', name: 'Mexico' },
  { code: '+55', name: 'Brazil' },
  { code: '+60', name: 'Malaysia' },
  { code: '+61', name: 'Australia' },
  { code: '+62', name: 'Indonesia' },
  { code: '+63', name: 'Philippines' },
  { code: '+64', name: 'New Zealand' },
  { code: '+65', name: 'Singapore' },
  { code: '+66', name: 'Thailand' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'South Korea' },
  { code: '+84', name: 'Vietnam' },
  { code: '+86', name: 'China' },
  { code: '+90', name: 'Turkey' },
  { code: '+91', name: 'India' },
  { code: '+92', name: 'Pakistan' },
  { code: '+966', name: 'Saudi Arabia' },
  { code: '+971', name: 'United Arab Emirates' },
];

export interface PhoneNumberInputValue {
  countryCode: string;
  number: string;
}

interface PhoneNumberInputProps {
  value: PhoneNumberInputValue;
  onChange: (val: PhoneNumberInputValue) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  disabled,
  placeholder = '1234567890',
}: PhoneNumberInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => COUNTRIES.find((c) => c.code === value.countryCode) || COUNTRIES[0],
    [value.countryCode]
  );

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const lowerSearch = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(lowerSearch) || c.code.includes(lowerSearch)
    );
  }, [search]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }

    return undefined;
  }, [open]);

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <div className="relative w-[20%] flex-shrink-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-1 rounded-xl border border-slate-400/45 bg-white/95 px-2 py-3 text-sm font-medium transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
        >
          <span className="text-[0.95rem]">{selected.code}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-60 flex-shrink-0"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div className="absolute left-0 bottom-full z-50 mb-2 w-64 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-2">
              <input
                type="text"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={`${country.name}-${country.code}`}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      onChange({ countryCode: country.code, number: value.number });
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="font-medium">{country.code}</span>
                    <span className="text-xs text-slate-500">{country.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-500">No country found.</div>
              )}
            </div>
          </div>
        )}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        disabled={disabled}
        value={value.number}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/\D+/g, '');
          onChange({ countryCode: value.countryCode, number: digitsOnly });
        }}
        maxLength={13}
        className="flex-1 rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
