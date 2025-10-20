import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

type VerifyLocationState = {
  email?: string;
  clientType?: 'B2B' | 'C2B';
  previewCode?: string | null;
};

const RESEND_COOLDOWN_SECONDS = 60;

export const VerifyEmailPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const { loadFromServer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VerifyLocationState | undefined) ?? {};

  const initialEmail = state.email || user?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const initialStatus = state.previewCode
    ? `Use the test code ${state.previewCode} to verify your email.`
    : initialEmail
    ? 'Check your inbox for the latest 6-digit code.'
    : null;
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(state.previewCode ?? null);

  const isLoggedInClient = user && user.role === 'client';
  const emailReadOnly = useMemo(() => Boolean(isLoggedInClient && user?.email), [isLoggedInClient, user?.email]);

  useEffect(() => {
    if (!status && email) {
      setStatus('Check your inbox for the latest 6-digit code.');
    }
  }, [email, status]);

useEffect(() => {
    if (user && user.isEmailVerified) {
      navigate('/account', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!initialEmail && user?.email) {
      setEmail(user.email);
    }
  }, [initialEmail, user?.email]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError('Enter the email address you used to register.');
        return;
      }
      if (code.trim().length !== 6) {
        setError('Enter the 6-digit verification code.');
        return;
      }

      await authApi.verifyEmail({
        email: normalizedEmail,
        code: code.trim(),
      });

      const refreshed = await refresh();
      if (refreshed?.role === 'client') {
        await loadFromServer();
      }

      navigate('/account', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    setResendLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await authApi.resendVerificationCode({ email: normalizedEmail });
      setStatus(`A new verification code has been sent to ${response.email}.`);
      setPreviewCode(response.previewCode ?? null);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to resend verification code right now.');
    } finally {
      setResendLoading(false);
    }
  };

  const showPreviewCode = !!previewCode && !import.meta.env.PROD;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 py-16 px-4">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/60 bg-white/70 px-8 py-10 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center">
            <img src="/logo.webp" alt="ULK Supply" className="h-9 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the six-digit code we sent to{' '}
            <span className="font-semibold text-slate-900">{email || 'your email'}</span>.
            {showPreviewCode && (
              <>
                {' '}
                <span className="text-xs font-semibold text-emerald-600">
                  (Test code: {previewCode})
                </span>
              </>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              readOnly={emailReadOnly}
              className="h-11 rounded-xl border border-border bg-white/95 px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Verification code
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
              required
              className="h-11 rounded-xl border border-border bg-white/95 px-4 text-center text-lg tracking-[0.5rem] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {status && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {status}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-orange-400 to-red-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-500 hover:to-red-500 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="text-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : resendLoading
              ? 'Resending…'
              : 'Resend code'}
          </button>
          <p>
            Entered the wrong email?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
              Go back to update it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};






