import { useEffect, useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';

const phoneNumbers = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];

const PromoBanner: React.FC = () => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.getElementById('promo-banner-keyframes')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'promo-banner-keyframes';
    style.textContent = `@keyframes promo-banner-shipping {0% {opacity: 0; transform: translateY(12px);} 5% {opacity: 1; transform: translateY(0);} 70% {opacity: 1; transform: translateY(0);} 74% {opacity: 0; transform: translateY(-12px);} 100% {opacity: 0; transform: translateY(-12px);}} @keyframes promo-banner-limited {0% {opacity: 0; transform: translateY(12px);} 74% {opacity: 0; transform: translateY(12px);} 79% {opacity: 1; transform: translateY(0);} 98% {opacity: 1; transform: translateY(0);} 100% {opacity: 0; transform: translateY(-12px);}}`;

    document.head.appendChild(style);
  }, []);

  const chipClass = 'inline-flex items-center whitespace-nowrap rounded-full border border-white/40 px-4 py-1 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]';

  const selectedNumber = useMemo(() => {
    return phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
  }, []);

  const telHref = useMemo(() => selectedNumber.replace(/[^+\d]/g, ''), [selectedNumber]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] text-white shadow-[0_12px_24px_rgba(160,11,11,0.25)]">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/15 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"
      />
      <div className="mx-auto flex max-w-content flex-col items-center justify-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:text-[0.75rem]">
        <div className="relative flex h-8 w-full items-center justify-center sm:hidden">
          <span
            className="absolute animate-[promo-banner-shipping_14s_linear_infinite] whitespace-nowrap px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white"
          >
            <span className="tracking-[0.22em] animate-pulse">🚚 Free Shipping Over $200</span>
          </span>
          <span
            className={`${chipClass} absolute animate-[promo-banner-limited_14s_linear_infinite]`}
          >
            <span className="tracking-[0.28em]">Limited Time Offer</span>
          </span>
        </div>
        <span className={`${chipClass} hidden sm:inline-flex`}>
          <span className="tracking-[0.28em]">Limited Time Offer</span>
        </span>
        <span className="hidden items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] sm:flex sm:text-sm">
          <span aria-hidden>🚚</span>
          <span className="animate-pulse whitespace-nowrap">Free Shipping Over $200</span>
        </span>
        <a
          href={`tel:${telHref}`}
          className={`${chipClass} hidden sm:inline-flex transition hover:border-white/50 hover:text-white`}
        >
          <span className="tracking-[0.28em]">Need Help? {selectedNumber}</span>
        </a>
      </div>
    </div>
  );
};

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
    <header className="sticky top-0 z-50">
      <PromoBanner />
      <div className="border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
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
                  {user.role === 'client' && (
                    <Link className="transition hover:text-primary" to="/account">
                      Account Dashboard
                    </Link>
                  )}
                  {(user.role === 'admin' || user.role === 'manager' || user.role === 'staff') && (
                    <Link className="transition hover:text-primary" to="/admin">
                      {user.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard'}
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
      </div>
    </header>
  );
};
