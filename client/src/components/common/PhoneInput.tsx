import { useState, useMemo } from 'react';

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

  const selected = useMemo(() => {
    return COUNTRIES.find((c) => c.code === value.countryCode) || COUNTRIES[0];
  }, [value.countryCode]);

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const lowerSearch = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.code.includes(lowerSearch)
    );
  }, [search]);

  return (
    <div className="phone-input-wrapper">
      <div className="phone-country-select">
        <button
          type="button"
          className="phone-country-button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <span>{value.countryCode}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.6 }}
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
          <div className="phone-country-dropdown">
            <input
              type="text"
              className="phone-country-search"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="phone-country-list">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c, idx) => (
                  <button
                    key={`${c.name}-${idx}`}
                    type="button"
                    className="phone-country-item"
                    onClick={() => {
                      onChange({ countryCode: c.code, number: value.number });
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="phone-country-code">{c.code}</span>
                    <span className="phone-country-name">{c.name}</span>
                  </button>
                ))
              ) : (
                <div className="phone-country-empty">No country found.</div>
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
        className="phone-number-input"
      />
    </div>
  );
}
