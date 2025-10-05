import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Catalog' },
  { to: '/on-sale', label: 'On Sale', disabled: true },
  { to: '/contact', label: 'Contact', disabled: true },
];

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { items } = useCart();

  const cartCount = items.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="hidden bg-primary px-6 py-2 text-xs text-white md:flex md:items-center md:justify-between">
        <span>Local pickup and nationwide delivery available</span>
        <span>Need help? Call (555) 123-4567</span>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold tracking-[0.4em] text-primary">SALAH</span>
          <span className="text-sm text-muted">Auto &amp; Industrial Supplies</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
          {navLinks.map(({ to, label, disabled }) => (
            <NavLink
              key={to}
              to={disabled ? '#' : to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary',
                  disabled && 'pointer-events-none opacity-40'
                )
              }
              aria-disabled={disabled}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm shadow-sm transition hover:border-primary hover:text-primary"
            aria-label="View cart"
          >
            <span>Cart</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white">
              {cartCount}
            </span>
          </Link>
          {user ? (
            <div className="relative">
              <span className="text-sm font-semibold text-slate-900">Hi, {user.name.split(' ')[0]}</span>
              <div className="mt-2 flex gap-3 text-xs text-slate-600 lg:justify-end">
                <Link className="transition hover:text-primary" to="/account">
                  Dashboard
                </Link>
                {(user.role === 'admin' || user.role === 'manager' || user.role === 'staff') && (
                  <Link className="transition hover:text-primary" to="/admin">
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-left text-slate-600 transition hover:text-primary"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-primary transition hover:text-primary-dark">
              Sign in / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
