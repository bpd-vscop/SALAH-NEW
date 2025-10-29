import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { BUSINESS_TYPE_OPTIONS, type BusinessTypeOption } from '../../data/businessTypes';
import { cn } from '../../utils/cn';

type BusinessTypeSelectProps = {
  value: BusinessTypeOption | '';
  onSelect: (value: BusinessTypeOption) => void;
  onSelectCustom: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export const BusinessTypeSelect: React.FC<BusinessTypeSelectProps> = ({
  value,
  onSelect,
  onSelectCustom,
  placeholder = 'Select business type',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selectedLabel = useMemo(() => value || placeholder, [value, placeholder]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const updatePosition = () => {
      const anchor = buttonRef.current;
      if (!anchor) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const menu = open && position
    ? createPortal(
        <div
          ref={menuRef}
          style={{ top: position.top, left: position.left, width: position.width, position: 'fixed' }}
          className="z-[9999]"
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="max-h-60 overflow-y-auto py-1">
              {BUSINESS_TYPE_OPTIONS.map((option) => {
                const isActive = option === value;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-medium transition',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-primary'
                      )}
                      onClick={() => {
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <span>{option}</span>
                      {isActive && <Check className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
                onClick={() => {
                  setOpen(false);
                  onSelectCustom();
                }}
              >
                Other (specify)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-left text-sm font-semibold text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className="flex items-center justify-between gap-3">
          <span className={value ? 'text-slate-900' : 'text-slate-400'}>{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-500" />
        </span>
      </button>
      {menu}
    </>
  );
};
