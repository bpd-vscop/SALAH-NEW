import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

type LocationState = {
  email?: string;
};

export const VerifyAccountPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const stateEmail = (location.state as LocationState)?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    } else if (user?.email) {
      setEmail(user.email);
    } else if (user?.username) {
      setEmail(user.username);
    }
  }, [location.state, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authApi.verify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      setUser(response.user);
      setSuccess(response.message || 'Account verified successfully.');

      setTimeout(() => {
        if (response.user.role === 'super_admin' || response.user.role === 'admin' || response.user.role === 'staff') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/account', { replace: true });
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-10 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-14 -right-14 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <Link to="/" className="flex justify-center">
            <img src="/logo.webp" alt="ULKS" className="h-16 w-auto" />
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Verify your email</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter the 6-digit code sent to your inbox to activate your ULKS account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Verification code
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                required
                inputMode="numeric"
                pattern="\d{6}"
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm tracking-[0.5rem] focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-red-700 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : 'Verify account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Didn&apos;t receive a code? Check your spam folder or{' '}
            <Link to="/register" className="font-semibold text-red-700 hover:text-red-800">
              resend after 15 minutes
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

