import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRIES } from '../../data/countries';

type DropdownOption = {
  label: string;
  value: string;
  code?: string;
};

export interface CountrySelectProps {
  value: string; // country name
  onChange: (countryName: string) => void;
  className?: string;
  defaultPhoneCode?: string; // to set default country based on phone code
  options?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  className = '',
  defaultPhoneCode,
  options,
  placeholder,
  searchPlaceholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const resolvedPlaceholder = placeholder ?? (options && options.length > 0 ? 'Select option' : 'Select Country');
  const resolvedSearchPlaceholder = searchPlaceholder ?? (options && options.length > 0 ? 'Search...' : 'Search countries...');

  // Set default country based on phone code
  useEffect(() => {
    if (defaultPhoneCode && !value && (!options || options.length === 0)) {
      const country = COUNTRIES.find(c => c.code === defaultPhoneCode);
      if (country) {
        onChange(country.name);
      }
    }
  }, [defaultPhoneCode, value, onChange, options]);

  const dropdownOptions = useMemo<DropdownOption[]>(() => {
    if (options && options.length > 0) {
      return options.map(option => ({
        label: option,
        value: option,
      }));
    }

    return COUNTRIES.map(country => ({
      label: country.name,
      value: country.name,
      code: country.code,
    }));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search) return dropdownOptions;
    const lowerSearch = search.toLowerCase();
    return dropdownOptions.filter(option => option.label.toLowerCase().includes(lowerSearch));
  }, [search, dropdownOptions]);

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

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value);
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
        <span className="text-slate-900">{value || resolvedPlaceholder}</span>
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
                placeholder={resolvedSearchPlaceholder}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No results found</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5 ${
                      value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-slate-900'
                    }`}
                  >
                    <span className="flex-1">{option.label}</span>
                    {value === option.value && (
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
