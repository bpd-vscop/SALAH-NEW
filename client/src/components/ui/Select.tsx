import { useState, useRef, useEffect, useLayoutEffect, useMemo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  portal?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  buttonClassName,
  disabled = false,
  portal = false,
  searchable = false,
  searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>(() => ({
    position: 'fixed',
    top: 0,
    left: 0,
    width: 0,
    zIndex: 1000,
    visibility: 'hidden',
  }));
  const [searchQuery, setSearchQuery] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !portal) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 1000,
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, portal]);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      if (option.value === '') return true;
      const label = option.label.toLowerCase();
      const valueText = option.value.toLowerCase();
      return label.includes(query) || valueText.includes(query);
    });
  }, [options, searchQuery, searchable]);
  const menuClassName = cn(
    portal ? 'fixed z-[1000]' : 'absolute left-0 right-0 top-full z-[100]',
    'max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl',
    !portal && 'mt-1'
  );
  const menuOptions = searchable ? filteredOptions : options;
  const menuContent = (
    <div className="p-1">
      {searchable && (
        <div className="sticky top-0 z-10 bg-white pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}
      {menuOptions.length ? (
        menuOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors',
              option.value === value
                ? 'bg-red-50 text-red-600'
                : 'text-slate-700 hover:bg-red-50 hover:text-red-600'
            )}
          >
            {option.label}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-xs text-slate-500">No results</div>
      )}
    </div>
  );

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        ref={buttonRef}
        className={cn(
          'flex h-7 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed',
          buttonClassName
        )}
      >
        <span className={cn('font-medium', !selectedOption && 'text-slate-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform flex-shrink-0',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>
      {portal
        ? (isOpen &&
            createPortal(
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={menuClassName}
                style={menuStyle}
                ref={menuRef}
              >
                {menuContent}
              </motion.div>,
              document.body
            ))
        : (
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={menuClassName}
                >
                  {menuContent}
                </motion.div>
              )}
            </AnimatePresence>
          )}
    </div>
  );
};
