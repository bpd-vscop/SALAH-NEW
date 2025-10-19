import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AdminSideNavDropdownItem {
  id: string;
  label: string;
  separatorAfter?: boolean;
}

export interface AdminSideNavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  dropdown?: {
    items: AdminSideNavDropdownItem[];
    activeId?: string;
  };
  activeLabel?: string;
}

interface AdminSideNavProps {
  items: AdminSideNavItem[];
  activeId: string;
  onSelect: (id: string, dropdownId?: string) => void;
  onDropdownTitleClick?: () => void;
}

export const AdminSideNav: React.FC<AdminSideNavProps> = ({ items, activeId, onSelect, onDropdownTitleClick }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav aria-label="Admin sections" className="space-y-1">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const showDropdown = Boolean(item.dropdown && item.dropdown.items?.length);
        const dropdownSelection = item.dropdown?.items.find(
          (option) => option.id === item.dropdown?.activeId
        );
        const currentActiveLabel = item.activeLabel ?? dropdownSelection?.label;
        const isOpen = openDropdown === item.id;

        const handleTrigger = () => {
          if (showDropdown) {
            // Toggle dropdown open/close
            const willOpen = openDropdown !== item.id;
            setOpenDropdown(willOpen ? item.id : null);

            // If user clicked to close the dropdown, close the sidebar
            if (!willOpen && onDropdownTitleClick) {
              onDropdownTitleClick();
            }
            return;
          }
          onSelect(item.id);
        };

        const handleOptionClick = (optionId: string) => {
          onSelect(item.id, optionId);
        };

        return (
          <div key={item.id}>
            <button
              type="button"
              data-dropdown-id={item.id}
              onClick={handleTrigger}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition',
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
              aria-pressed={isActive}
              aria-haspopup={showDropdown || undefined}
              aria-expanded={showDropdown ? isOpen : undefined}
            >
              {item.icon && (
                <span className="flex h-5 w-5 items-center justify-center flex-shrink-0">
                  {item.icon}
                </span>
              )}

              <span className="flex-1 text-left truncate">
                {isActive && currentActiveLabel ? currentActiveLabel : item.label}
              </span>

              {showDropdown && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform flex-shrink-0',
                    isOpen ? 'rotate-180' : ''
                  )}
                />
              )}
            </button>

            <AnimatePresence>
              {showDropdown && isOpen && item.dropdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-1 ml-8 space-y-1">
                    {item.dropdown.items.map((option) => {
                      const selected = option.id === item.dropdown?.activeId;
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => handleOptionClick(option.id)}
                            className={cn(
                              'w-full text-left px-4 py-2 rounded-lg text-sm transition',
                              selected
                                ? 'text-primary font-medium bg-primary/10'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                          >
                            {option.label}
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
