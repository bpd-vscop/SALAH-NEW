import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';

type RegistrationStep = 0 | 1 | 2;

type RegistrationForm = {
  clientType: 'B2B' | 'C2B';
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
};

const initialForm: RegistrationForm = {
  clientType: 'B2B',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
};

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { items, loadFromServer } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [step, setStep] = useState<RegistrationStep>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<{ email: string; expiresAt?: string } | null>(null);

  const stepCount = useMemo(() => (form.clientType === 'B2B' ? 3 : 2), [form.clientType]);

  const guestCart = useMemo(
    () => items.map((item: CartLine) => ({ productId: item.productId, quantity: item.quantity })),
    [items]
  );

  const validateBasicInfo = () => {
    if (!form.fullName.trim()) {
      return 'Full name is required.';
    }
    if (!form.email.trim()) {
      return 'Email address is required.';
    }
    if (!/^[\w.!#$%&'*+/=?^_`{|}~-]+@[\w-]+(\.[\w-]+)+$/.test(form.email.trim())) {
      return 'Please provide a valid email address.';
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const validateCompanyInfo = () => {
    if (!form.companyName.trim()) {
      return 'Company name is required for B2B accounts.';
    }
    if (!form.companyAddress.trim()) {
      return 'Company address is required for B2B accounts.';
    }
    return null;
  };

  const handleBasicInfoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateBasicInfo();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (form.clientType === 'B2B') {
      setStep(1);
    } else {
      void completeRegistration();
    }
  };

  const handleCompanySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCompanyInfo();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    void completeRegistration();
  };

  const completeRegistration = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { user, verification, requiresVerification } = await register({
        clientType: form.clientType,
        basicInfo: {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
        companyInfo:
          form.clientType === 'B2B'
            ? {
                companyName: form.companyName.trim(),
                companyAddress: form.companyAddress.trim(),
                companyPhone: form.companyPhone.trim() || undefined,
              }
            : undefined,
        guestCart,
      });

      if (!requiresVerification) {
        await loadFromServer();
      }

      setVerificationInfo({
        email: verification?.email || user.email || form.email.trim().toLowerCase(),
        expiresAt: verification?.expiresAt,
      });
      setStep(form.clientType === 'B2B' ? 2 : 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
      if (form.clientType === 'C2B') {
        setStep(0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setStep(0);
    setError(null);
    setVerificationInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 py-16 px-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row">
        <section className="w-full rounded-3xl border border-white/60 bg-white/80 p-10 shadow-2xl backdrop-blur-xl lg:w-2/3">
          <div className="flex flex-col gap-4 text-center">
            <Link to="/" className="mx-auto">
              <img src="/logo.webp" alt="ULKS" className="h-16 w-auto" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Create your ULKS account</h1>
            <p className="text-sm text-slate-600">
              Choose your client type and complete the quick onboarding steps to access the ULKS catalog.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            {Array.from({ length: stepCount }).map((_, index) => {
              const isActive = index === step;
              const isComplete = index < step;
              return (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                    isActive
                      ? 'border-transparent bg-gradient-to-r from-amber-400 to-red-700 text-white shadow-lg'
                      : isComplete
                      ? 'border-transparent bg-emerald-500/20 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isComplete ? '✔' : index + 1}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {step === 0 && (
            <form onSubmit={handleBasicInfoSubmit} className="mt-8 space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(['B2B', 'C2B'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, clientType: type }))}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      form.clientType === type
                        ? 'border-transparent bg-gradient-to-r from-amber-400 to-red-700 text-white shadow-lg'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{type === 'B2B' ? 'Business (B2B)' : 'Individual (C2B)'}</span>
                    <span className="mt-1 block text-xs opacity-80">
                      {type === 'B2B'
                        ? 'For companies purchasing on behalf of their business.'
                        : 'For consumers purchasing directly from ULKS partners.'}
                    </span>
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Full name
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Jane Doe"
                  required
                  className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  required
                  className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Create a password"
                    required
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Confirm password
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    placeholder="Repeat your password"
                    required
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-red-700 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && form.clientType === 'C2B' ? 'Creating account…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 1 && form.clientType === 'B2B' && (
            <form onSubmit={handleCompanySubmit} className="mt-8 space-y-6">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Company name
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                  placeholder="ULK Supply LLC"
                  required
                  className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Company address
                <textarea
                  value={form.companyAddress}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
                  placeholder="123 Market Street, Casablanca"
                  rows={3}
                  required
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Company phone (optional)
                <input
                  type="tel"
                  value={form.companyPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
                  placeholder="(+212) 600-000000"
                  className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-red-700 focus:outline-none focus:ring-4 focus:ring-red-700/10"
                />
              </label>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="h-11 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:shadow-md"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-red-700 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Creating account…' : 'Create account'}
                </button>
              </div>
            </form>
          )}

          {((step === 1 && form.clientType === 'C2B') || step === 2) && verificationInfo && (
            <div className="mt-10 space-y-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg">
                ✔
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-emerald-800">Check your inbox</h2>
                <p className="text-sm text-emerald-700">
                  We sent a 6-digit verification code to <strong>{verificationInfo.email}</strong>. Enter it within 15 minutes to
                  activate your account.
                </p>
                {verificationInfo.expiresAt && (
                  <p className="text-xs text-emerald-700/80">
                    Code expires at {new Date(verificationInfo.expiresAt).toLocaleTimeString()}.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/verify', { state: { email: verificationInfo.email } })}
                  className="h-11 rounded-full bg-gradient-to-r from-amber-400 to-red-700 px-6 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
                >
                  Verify my account
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:shadow-md"
                >
                  Register another account
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="w-full rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl lg:w-1/3">
          <h2 className="text-lg font-semibold text-slate-900">Why join ULKS?</h2>
          <ul className="mt-6 space-y-4 text-sm text-slate-600">
            <li className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <span className="font-semibold text-red-700">Fast access</span>
              <p className="mt-1 text-xs">Get verified quickly with our email confirmation process.</p>
            </li>
            <li className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <span className="font-semibold text-red-700">B2B &amp; C2B support</span>
              <p className="mt-1 text-xs">Tailored flows for businesses and individual shoppers.</p>
            </li>
            <li className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <span className="font-semibold text-red-700">Secure platform</span>
              <p className="mt-1 text-xs">All accounts require email verification before checkout.</p>
            </li>
          </ul>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-red-700 hover:text-red-800">
              Sign in here
            </Link>
            .
          </div>
        </aside>
      </div>
    </div>
  );
};

