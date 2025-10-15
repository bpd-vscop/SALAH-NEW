import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AdminTopNavDropdownItem {
  id: string;
  label: string;
}

export interface AdminTopNavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  dropdown?: {
    items: AdminTopNavDropdownItem[];
    activeId?: string;
  };
  hideLabel?: boolean;
  activeLabel?: string;
}

interface AdminTopNavProps {
  items: AdminTopNavItem[];
  activeId: string;
  onSelect: (id: string, dropdownId?: string) => void;
}

export const AdminTopNav: React.FC<AdminTopNavProps> = ({ items, activeId, onSelect }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setOpenDropdown(null));
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      aria-label="Admin sections"
      className="relative flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-full bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        const showDropdown = Boolean(item.dropdown && item.dropdown.items?.length);
        const dropdownSelection = item.dropdown?.items.find(
          (option) => option.id === item.dropdown?.activeId
        );
        const shouldHighlight = isActive || openDropdown === item.id;
        const currentActiveLabel = item.activeLabel ?? dropdownSelection?.label;

        const handleTrigger = () => {
          if (showDropdown) {
            setOpenDropdown((current) => (current === item.id ? null : item.id));
            return;
          }
          onSelect(item.id);
        };

        const handleOptionClick = (optionId: string) => {
          onSelect(item.id, optionId);
          setOpenDropdown(null);
        };

        return (
          <div key={item.id} className="relative">
            <button
              type="button"
              onClick={handleTrigger}
              className={cn(
                'relative flex min-w-max items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                shouldHighlight ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              )}
              aria-pressed={isActive}
              aria-haspopup={showDropdown || undefined}
              aria-expanded={showDropdown ? openDropdown === item.id : undefined}
            >
              {shouldHighlight && (
                <motion.span
                  layoutId="admin-top-nav-highlight"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-dark shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                {item.icon && (
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center',
                      shouldHighlight ? 'text-white' : 'text-slate-500'
                    )}
                  >
                    {item.icon}
                  </span>
                )}

                <span className="text-sm font-semibold whitespace-nowrap">
                  {shouldHighlight && currentActiveLabel ? currentActiveLabel : item.label}
                </span>

                {showDropdown && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      openDropdown === item.id ? 'rotate-180' : '',
                      shouldHighlight ? 'text-white' : 'text-slate-500'
                    )}
                  />
                )}
              </span>
            </button>

            <AnimatePresence>
              {showDropdown && openDropdown === item.id && item.dropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-40 mt-3 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <ul className="py-2 text-sm text-slate-600">
                    {item.dropdown.items.map((option) => {
                      const selected = option.id === item.dropdown?.activeId;
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => handleOptionClick(option.id)}
                            className={cn(
                              'flex w-full items-center justify-between px-4 py-2 transition',
                              selected ? 'text-primary' : 'hover:bg-primary/5 hover:text-primary'
                            )}
                          >
                            <span>{option.label}</span>
                            {selected && (
                              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                active
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
};
