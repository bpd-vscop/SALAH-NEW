import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const emailFromState = (location.state as { email?: string } | undefined)?.email;
    if (user?.email) {
      setEmail(user.email);
    } else if (emailFromState) {
      setEmail(emailFromState);
    }
  }, [user, location.state]);

  useEffect(() => {
    if (user && user.role !== 'client') {
      navigate('/', { replace: true });
      return;
    }
    if (user?.isEmailVerified) {
      navigate('/account', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await authApi.verifyEmail({ email: email.trim().toLowerCase(), code: code.trim() });
      await refresh();
      setMessage('Email verified. Redirecting to your dashboard…');
      setTimeout(() => navigate('/account', { replace: true }), 1200);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    setError(null);
    try {
      await authApi.resendVerification({ email: email.trim().toLowerCase() });
      setMessage('A new verification code has been sent to your email.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 py-16 px-4">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Verify your account</p>
          <h1 className="text-2xl font-semibold text-slate-900">Enter the 6-digit code</h1>
          <p className="text-sm text-muted">
            We emailed a verification code to {email || 'your inbox'}. Enter it below to activate your account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Verification code
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="h-11 rounded-xl border border-border bg-white px-4 text-center text-lg tracking-[0.3em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="123456"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          {message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-muted">
          <span>Didn’t receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-primary hover:text-primary-dark disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
};
