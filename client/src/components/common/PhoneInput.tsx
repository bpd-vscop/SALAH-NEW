import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Country = { code: string; name: string };

const COUNTRIES: Country[] = [
{ code: '+1', name: 'United States' },
  { code: '+1', name: 'Canada' },
  { code: '+1-242', name: 'Bahamas' },
  { code: '+1-246', name: 'Barbados' },
  { code: '+1-264', name: 'Anguilla' },
  { code: '+1-268', name: 'Antigua and Barbuda' },
  { code: '+1-284', name: 'British Virgin Islands' },
  { code: '+1-340', name: 'U.S. Virgin Islands' },
  { code: '+1-345', name: 'Cayman Islands' },
  { code: '+1-441', name: 'Bermuda' },
  { code: '+1-473', name: 'Grenada' },
  { code: '+1-649', name: 'Turks and Caicos Islands' },
  { code: '+1-664', name: 'Montserrat' },
  { code: '+1-670', name: 'Northern Mariana Islands' },
  { code: '+1-671', name: 'Guam' },
  { code: '+1-684', name: 'American Samoa' },
  { code: '+1-758', name: 'Saint Lucia' },
  { code: '+1-767', name: 'Dominica' },
  { code: '+1-784', name: 'Saint Vincent' },
  { code: '+1-809', name: 'Dominican Republic' },
  { code: '+1-829', name: 'Dominican Republic' },
  { code: '+1-849', name: 'Dominican Republic' },
  { code: '+1-868', name: 'Trinidad and Tobago' },
  { code: '+1-869', name: 'Saint Kitts and Nevis' },
  { code: '+1-876', name: 'Jamaica' },
  { code: '+20', name: 'Egypt' },
  { code: '+212', name: 'Morocco' },
  { code: '+213', name: 'Algeria' },
  { code: '+216', name: 'Tunisia' },
  { code: '+218', name: 'Libya' },
  { code: '+220', name: 'Gambia' },
  { code: '+221', name: 'Senegal' },
  { code: '+222', name: 'Mauritania' },
  { code: '+223', name: 'Mali' },
  { code: '+224', name: 'Guinea' },
  { code: '+225', name: 'Ivory Coast' },
  { code: '+226', name: 'Burkina Faso' },
  { code: '+227', name: 'Niger' },
  { code: '+228', name: 'Togo' },
  { code: '+229', name: 'Benin' },
  { code: '+230', name: 'Mauritius' },
  { code: '+231', name: 'Liberia' },
  { code: '+232', name: 'Sierra Leone' },
  { code: '+233', name: 'Ghana' },
  { code: '+234', name: 'Nigeria' },
  { code: '+235', name: 'Chad' },
  { code: '+236', name: 'Central African Republic' },
  { code: '+237', name: 'Cameroon' },
  { code: '+238', name: 'Cape Verde' },
  { code: '+239', name: 'Sao Tome and Principe' },
  { code: '+240', name: 'Equatorial Guinea' },
  { code: '+241', name: 'Gabon' },
  { code: '+242', name: 'Congo' },
  { code: '+243', name: 'Democratic Republic of the Congo' },
  { code: '+244', name: 'Angola' },
  { code: '+245', name: 'Guinea-Bissau' },
  { code: '+248', name: 'Seychelles' },
  { code: '+249', name: 'Sudan' },
  { code: '+250', name: 'Rwanda' },
  { code: '+251', name: 'Ethiopia' },
  { code: '+252', name: 'Somalia' },
  { code: '+253', name: 'Djibouti' },
  { code: '+254', name: 'Kenya' },
  { code: '+255', name: 'Tanzania' },
  { code: '+256', name: 'Uganda' },
  { code: '+257', name: 'Burundi' },
  { code: '+258', name: 'Mozambique' },
  { code: '+260', name: 'Zambia' },
  { code: '+261', name: 'Madagascar' },
  { code: '+262', name: 'Réunion' },
  { code: '+263', name: 'Zimbabwe' },
  { code: '+264', name: 'Namibia' },
  { code: '+265', name: 'Malawi' },
  { code: '+266', name: 'Lesotho' },
  { code: '+267', name: 'Botswana' },
  { code: '+268', name: 'Eswatini' },
  { code: '+269', name: 'Comoros' },
  { code: '+27', name: 'South Africa' },
  { code: '+290', name: 'Saint Helena' },
  { code: '+291', name: 'Eritrea' },
  { code: '+297', name: 'Aruba' },
  { code: '+298', name: 'Faroe Islands' },
  { code: '+299', name: 'Greenland' },
  { code: '+30', name: 'Greece' },
  { code: '+31', name: 'Netherlands' },
  { code: '+32', name: 'Belgium' },
  { code: '+33', name: 'France' },
  { code: '+34', name: 'Spain' },
  { code: '+350', name: 'Gibraltar' },
  { code: '+351', name: 'Portugal' },
  { code: '+352', name: 'Luxembourg' },
  { code: '+353', name: 'Ireland' },
  { code: '+354', name: 'Iceland' },
  { code: '+355', name: 'Albania' },
  { code: '+356', name: 'Malta' },
  { code: '+357', name: 'Cyprus' },
  { code: '+358', name: 'Finland' },
  { code: '+359', name: 'Bulgaria' },
  { code: '+36', name: 'Hungary' },
  { code: '+370', name: 'Lithuania' },
  { code: '+371', name: 'Latvia' },
  { code: '+372', name: 'Estonia' },
  { code: '+373', name: 'Moldova' },
  { code: '+374', name: 'Armenia' },
  { code: '+375', name: 'Belarus' },
  { code: '+376', name: 'Andorra' },
  { code: '+377', name: 'Monaco' },
  { code: '+378', name: 'San Marino' },
  { code: '+379', name: 'Vatican City' },
  { code: '+380', name: 'Ukraine' },
  { code: '+381', name: 'Serbia' },
  { code: '+382', name: 'Montenegro' },
  { code: '+383', name: 'Kosovo' },
  { code: '+385', name: 'Croatia' },
  { code: '+386', name: 'Slovenia' },
  { code: '+387', name: 'Bosnia and Herzegovina' },
  { code: '+389', name: 'North Macedonia' },
  { code: '+39', name: 'Italy' },
  { code: '+40', name: 'Romania' },
  { code: '+41', name: 'Switzerland' },
  { code: '+420', name: 'Czech Republic' },
  { code: '+421', name: 'Slovakia' },
  { code: '+423', name: 'Liechtenstein' },
  { code: '+43', name: 'Austria' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+45', name: 'Denmark' },
  { code: '+46', name: 'Sweden' },
  { code: '+47', name: 'Norway' },
  { code: '+48', name: 'Poland' },
  { code: '+49', name: 'Germany' },
  { code: '+500', name: 'Falkland Islands' },
  { code: '+501', name: 'Belize' },
  { code: '+502', name: 'Guatemala' },
  { code: '+503', name: 'El Salvador' },
  { code: '+504', name: 'Honduras' },
  { code: '+505', name: 'Nicaragua' },
  { code: '+506', name: 'Costa Rica' },
  { code: '+507', name: 'Panama' },
  { code: '+508', name: 'Saint Pierre and Miquelon' },
  { code: '+509', name: 'Haiti' },
  { code: '+51', name: 'Peru' },
  { code: '+52', name: 'Mexico' },
  { code: '+53', name: 'Cuba' },
  { code: '+54', name: 'Argentina' },
  { code: '+55', name: 'Brazil' },
  { code: '+56', name: 'Chile' },
  { code: '+57', name: 'Colombia' },
  { code: '+58', name: 'Venezuela' },
  { code: '+590', name: 'Guadeloupe' },
  { code: '+591', name: 'Bolivia' },
  { code: '+592', name: 'Guyana' },
  { code: '+593', name: 'Ecuador' },
  { code: '+594', name: 'French Guiana' },
  { code: '+595', name: 'Paraguay' },
  { code: '+596', name: 'Martinique' },
  { code: '+597', name: 'Suriname' },
  { code: '+598', name: 'Uruguay' },
  { code: '+599', name: 'Curaçao' },
  { code: '+60', name: 'Malaysia' },
  { code: '+61', name: 'Australia' },
  { code: '+62', name: 'Indonesia' },
  { code: '+63', name: 'Philippines' },
  { code: '+64', name: 'New Zealand' },
  { code: '+65', name: 'Singapore' },
  { code: '+66', name: 'Thailand' },
  { code: '+670', name: 'Timor-Leste' },
  { code: '+672', name: 'Norfolk Island' },
  { code: '+673', name: 'Brunei' },
  { code: '+674', name: 'Nauru' },
  { code: '+675', name: 'Papua New Guinea' },
  { code: '+676', name: 'Tonga' },
  { code: '+677', name: 'Solomon Islands' },
  { code: '+678', name: 'Vanuatu' },
  { code: '+679', name: 'Fiji' },
  { code: '+680', name: 'Palau' },
  { code: '+681', name: 'Wallis and Futuna' },
  { code: '+682', name: 'Cook Islands' },
  { code: '+683', name: 'Niue' },
  { code: '+685', name: 'Samoa' },
  { code: '+686', name: 'Kiribati' },
  { code: '+687', name: 'New Caledonia' },
  { code: '+688', name: 'Tuvalu' },
  { code: '+689', name: 'French Polynesia' },
  { code: '+690', name: 'Tokelau' },
  { code: '+691', name: 'Micronesia' },
  { code: '+692', name: 'Marshall Islands' },
  { code: '+7', name: 'Russia' },
  { code: '+7', name: 'Kazakhstan' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'South Korea' },
  { code: '+84', name: 'Vietnam' },
  { code: '+850', name: 'North Korea' },
  { code: '+852', name: 'Hong Kong' },
  { code: '+853', name: 'Macau' },
  { code: '+855', name: 'Cambodia' },
  { code: '+856', name: 'Laos' },
  { code: '+86', name: 'China' },
  { code: '+880', name: 'Bangladesh' },
  { code: '+886', name: 'Taiwan' },
  { code: '+90', name: 'Turkey' },
  { code: '+91', name: 'India' },
  { code: '+92', name: 'Pakistan' },
  { code: '+93', name: 'Afghanistan' },
  { code: '+94', name: 'Sri Lanka' },
  { code: '+95', name: 'Myanmar' },
  { code: '+960', name: 'Maldives' },
  { code: '+961', name: 'Lebanon' },
  { code: '+962', name: 'Jordan' },
  { code: '+963', name: 'Syria' },
  { code: '+964', name: 'Iraq' },
  { code: '+965', name: 'Kuwait' },
  { code: '+966', name: 'Saudi Arabia' },
  { code: '+967', name: 'Yemen' },
  { code: '+968', name: 'Oman' },
  { code: '+970', name: 'Palestine' },
  { code: '+971', name: 'United Arab Emirates' },
  { code: '+972', name: 'Israel' },
  { code: '+973', name: 'Bahrain' },
  { code: '+974', name: 'Qatar' },
  { code: '+975', name: 'Bhutan' },
  { code: '+976', name: 'Mongolia' },
  { code: '+977', name: 'Nepal' },
  { code: '+98', name: 'Iran' },
  { code: '+992', name: 'Tajikistan' },
  { code: '+993', name: 'Turkmenistan' },
  { code: '+994', name: 'Azerbaijan' },
  { code: '+995', name: 'Georgia' },
  { code: '+996', name: 'Kyrgyzstan' },
  { code: '+998', name: 'Uzbekistan' },
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
  required?: boolean;
  placement?: 'auto' | 'top' | 'bottom';
  portalZIndex?: number;
  size?: 'default' | 'compact';
}

export function PhoneNumberInput({
  value,
  onChange,
  disabled,
  placeholder = '1234567890',
  required = false,
  placement = 'top',
  portalZIndex,
  size = 'default',
}: PhoneNumberInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 300,
    listMaxHeight: 224,
  });
  const isAutoPlacement = placement === 'auto';
  const resolvedZIndex = portalZIndex ?? 9999;
  const buttonClassName =
    size === 'compact'
      ? 'flex w-full items-center justify-between gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium transition focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
      : 'flex w-full items-center justify-between gap-1 rounded-xl border border-slate-400/45 bg-white/95 px-2 py-3 text-sm font-medium transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 disabled:cursor-not-allowed disabled:opacity-60';
  const inputClassName =
    size === 'compact'
      ? 'flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm transition focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
      : 'flex-1 rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 disabled:cursor-not-allowed disabled:opacity-60';

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
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 300;
      const defaultTop = rect.top + window.scrollY - dropdownHeight - 8;
      const defaultPosition = {
        top: defaultTop,
        left: rect.left + window.scrollX,
        maxHeight: dropdownHeight,
        listMaxHeight: 224,
      };

      if (!isAutoPlacement) {
        const nextTop = placement === 'bottom'
          ? rect.bottom + window.scrollY + 8
          : defaultTop;
        setDropdownPosition({ ...defaultPosition, top: nextTop });
        return;
      }

      const optionHeight = 40;
      const searchHeight = 48;
      const estimatedHeight = Math.min(dropdownHeight, searchHeight + filteredCountries.length * optionHeight);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.min(dropdownHeight, Math.max(160, availableSpace - 8));
      const listMaxHeight = Math.max(120, maxHeight - searchHeight - 8);
      const top = shouldOpenUp
        ? rect.top + window.scrollY - maxHeight - 8
        : rect.bottom + window.scrollY + 8;

      setDropdownPosition({
        top: Math.max(8, top),
        left: rect.left + window.scrollX,
        maxHeight,
        listMaxHeight,
      });
    }
  }, [open, isAutoPlacement, placement, filteredCountries.length]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !dropdownRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }

    return undefined;
  }, [open]);

  const handleCountrySelect = (country: Country) => {
    onChange({ countryCode: country.code, number: value.number });
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <div className="relative w-[20%] flex-shrink-0">
        <button
          type="button"
          className={buttonClassName}
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
        {open && createPortal(
          <div
            ref={dropdownRef}
            className="absolute w-64 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              maxHeight: isAutoPlacement ? `${dropdownPosition.maxHeight}px` : undefined,
              zIndex: resolvedZIndex,
            }}
          >
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
            <div
              className="max-h-56 overflow-y-auto"
              style={isAutoPlacement ? { maxHeight: `${dropdownPosition.listMaxHeight}px` } : undefined}
            >
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={`${country.name}-${country.code}`}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleCountrySelect(country)}
                  >
                    <span className="font-medium">{country.code}</span>
                    <span className="text-xs text-slate-500">{country.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-500">No country found.</div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={value.number}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/\D+/g, '');
          onChange({ countryCode: value.countryCode, number: digitsOnly });
        }}
        maxLength={13}
        className={inputClassName}
      />
    </div>
  );
}
