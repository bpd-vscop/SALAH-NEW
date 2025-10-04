import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

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
    <header className="site-header">
      <div className="top-bar">
        <span>Local pickup and nationwide delivery available</span>
        <span>Need help? Call (555) 123-4567</span>
      </div>
      <div className="nav-bar">
        <Link to="/" className="brand">
          <span className="brand-mark">SALAH</span>
          <span className="brand-sub">Auto & Industrial Supplies</span>
        </Link>
        <nav className="main-nav">
          {navLinks.map(({ to, label, disabled }) => (
            <NavLink
              key={to}
              to={disabled ? '#' : to}
              className={({ isActive }) =>
                [
                  'nav-item',
                  isActive ? 'nav-item-active' : '',
                  disabled ? 'nav-item-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              aria-disabled={disabled}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <Link to="/cart" className="cart-chip" aria-label="View cart">
            <span>Cart</span>
            <span className="cart-count">{cartCount}</span>
          </Link>
          {user ? (
            <div className="account-menu">
              <span className="user-name">Hi, {user.name.split(' ')[0]}</span>
              <div className="account-links">
                <Link to="/account">Dashboard</Link>
                {(user.role === 'admin' || user.role === 'manager' || user.role === 'staff') && (
                  <Link to="/admin">Admin</Link>
                )}
                <button type="button" onClick={() => logout()}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="login-link">
              Sign in / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
