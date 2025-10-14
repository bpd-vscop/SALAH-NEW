import { motion } from 'framer-motion';

export interface AdminTopNavItem {
  id: string;
  label: string;
}

interface AdminTopNavProps {
  items: AdminTopNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const AdminTopNav: React.FC<AdminTopNavProps> = ({ items, activeId, onSelect }) => (
  <nav
    aria-label="Admin sections"
    className="relative flex items-center gap-1 rounded-full bg-white/70 px-1 py-1 shadow-sm backdrop-blur-md"
  >
    {items.map((item) => {
      const isActive = item.id === activeId;

      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="relative flex min-w-[96px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-pressed={isActive}
        >
          {isActive && (
            <motion.span
              layoutId="admin-top-nav-highlight"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-dark shadow-md"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={isActive ? 'relative z-10 text-white' : 'relative z-10'}>
            {item.label}
          </span>
        </button>
      );
    })}
  </nav>
);
