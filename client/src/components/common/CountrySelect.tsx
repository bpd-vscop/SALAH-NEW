import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRIES, type CountryData } from '../../data/countries';

export interface CountrySelectProps {
  value: string; // country name
  onChange: (countryName: string) => void;
  className?: string;
  defaultPhoneCode?: string; // to set default country based on phone code
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  className = '',
  defaultPhoneCode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set default country based on phone code
  useEffect(() => {
    if (defaultPhoneCode && !value) {
      const country = COUNTRIES.find(c => c.code === defaultPhoneCode);
      if (country) {
        onChange(country.name);
      }
    }
  }, [defaultPhoneCode, value, onChange]);

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES;
    const lowerSearch = search.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(lowerSearch));
  }, [search]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (country: CountryData) => {
    onChange(country.name);
    setIsOpen(false);
    setSearch('');
  };

  const buttonRect = buttonRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left text-sm transition-colors hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 ${className}`}
      >
        <span className="text-slate-900">{value || 'Select Country'}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        buttonRect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${buttonRect.bottom + window.scrollY + 4}px`,
              left: `${buttonRect.left + window.scrollX}px`,
              width: `${buttonRect.width}px`,
              zIndex: 9999,
            }}
            className="max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="sticky top-0 bg-white p-3 border-b border-slate-100">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No countries found</div>
              ) : (
                filteredCountries.map((country, index) => (
                  <button
                    key={`${country.code}-${country.name}-${index}`}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5 ${
                      value === country.name ? 'bg-primary/10 text-primary font-medium' : 'text-slate-900'
                    }`}
                  >
                    <span className="flex-1">{country.name}</span>
                    {value === country.name && (
                      <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
