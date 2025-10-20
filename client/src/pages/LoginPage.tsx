import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';

type LocationState = {
  from?: {
    pathname: string;
  };
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { items, loadFromServer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const guestCart = items.map((item: CartLine) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const { user, requiresVerification } = await login({
        email: email.trim().toLowerCase(),
        password,
        guestCart,
      });

      if (requiresVerification) {
        navigate('/verify', {
          replace: true,
          state: { email: user.email || email.trim().toLowerCase() },
        });
        return;
      }

      await loadFromServer();

      if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'staff') {
        navigate('/admin', { replace: true });
        return;
      }

      const from = (location.state as LocationState)?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/account', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <Link to="/">
              <img src="/logo.webp" alt="ULKS" className="h-20 w-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-600">Sign in to manage your orders and account.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="h-12 rounded-xl border border-slate-300 bg-white/95 px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Password
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white/95 px-4 pr-12 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-700/40"
                />
                Remember me
              </label>
              <span className="cursor-pointer font-medium text-red-700/80 hover:text-red-700">Forgot password?</span>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-red-700 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 space-y-2 text-center text-xs text-slate-500">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-red-700 hover:text-red-800">
                Create one
              </Link>
            </p>
            <p>
              © {new Date().getFullYear()} ULK Supply LLC. Powered by{' '}
              <a
                href="https://www.bpd.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber-500 hover:text-red-700"
              >
                BP. Digital
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

