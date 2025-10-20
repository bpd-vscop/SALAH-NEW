import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';

interface BasicInfoForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface CompanyInfoForm {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

type Step = 'clientType' | 'basic' | 'company';

type ClientType = 'B2B' | 'C2B';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { items, loadFromServer } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('clientType');
  const [clientType, setClientType] = useState<ClientType | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoForm>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => {
    if (step === 'clientType') {
      setStep('basic');
      return;
    }
    if (step === 'basic' && clientType === 'B2B') {
      setStep('company');
      return;
    }
  };

  const validateClientType = () => {
    if (!clientType) {
      setError('Choose the client type that best fits your needs.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateBasicInfo = () => {
    if (!basicInfo.fullName.trim()) {
      setError('Full name is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicInfo.email)) {
      setError('Enter a valid email address.');
      return false;
    }
    if (basicInfo.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    if (basicInfo.password !== basicInfo.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateCompanyInfo = () => {
    if (!companyInfo.companyName.trim()) {
      setError('Company name is required for B2B accounts.');
      return false;
    }
    if (!companyInfo.companyAddress.trim()) {
      setError('Company address is required for B2B accounts.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleClientType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validateClientType()) {
      nextStep();
    }
  };

  const handleBasicInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateBasicInfo()) {
      return;
    }
    if (clientType === 'B2B') {
      nextStep();
      return;
    }
    void submitRegistration();
  };

  const handleCompanyInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCompanyInfo()) {
      return;
    }
    void submitRegistration();
  };

  const submitRegistration = async () => {
    if (!clientType) {
      setError('Choose a client type to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        clientType,
        basicInfo: {
          fullName: basicInfo.fullName.trim(),
          email: basicInfo.email.trim().toLowerCase(),
          password: basicInfo.password,
        },
        companyInfo:
          clientType === 'B2B'
            ? {
                companyName: companyInfo.companyName.trim(),
                companyAddress: companyInfo.companyAddress.trim(),
                companyPhone: companyInfo.companyPhone.trim() || undefined,
              }
            : undefined,
        guestCart: items.map((item: CartLine) => ({ productId: item.productId, quantity: item.quantity })),
      });
      await loadFromServer();
      navigate('/verify', { replace: true, state: { email: basicInfo.email.trim().toLowerCase() } });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderClientTypeStep = () => (
    <form className="space-y-6" onSubmit={handleClientType}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setClientType('C2B')}
          className={`w-full rounded-2xl border px-4 py-4 text-left text-sm transition ${
            clientType === 'C2B'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary hover:bg-primary/5'
          }`}
        >
          <span className="block font-semibold">Consumer to Business (C2B)</span>
          <span className="mt-1 block text-muted">
            Personal purchasing with access to order history and account management.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setClientType('B2B')}
          className={`w-full rounded-2xl border px-4 py-4 text-left text-sm transition ${
            clientType === 'B2B'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary hover:bg-primary/5'
          }`}
        >
          <span className="block font-semibold">Business to Business (B2B)</span>
          <span className="mt-1 block text-muted">
            Company purchasing with trade pricing and invoicing support.
          </span>
        </button>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
        >
          Continue
        </button>
      </div>
    </form>
  );

  const renderBasicInfoStep = () => (
    <form className="space-y-4" onSubmit={handleBasicInfo}>
      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Full name
          <input
            type="text"
            value={basicInfo.fullName}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, fullName: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Work email
          <input
            type="email"
            value={basicInfo.email}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, email: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="you@company.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Password
          <input
            type="password"
            value={basicInfo.password}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, password: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            minLength={8}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Confirm password
          <input
            type="password"
            value={basicInfo.confirmPassword}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            minLength={8}
          />
        </label>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep('clientType')}
          className="text-sm font-medium text-muted hover:text-primary"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
        >
          {clientType === 'B2B' ? 'Continue' : loading ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </form>
  );

  const renderCompanyStep = () => (
    <form className="space-y-4" onSubmit={handleCompanyInfo}>
      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Company name
          <input
            type="text"
            value={companyInfo.companyName}
            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyName: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Company address
          <input
            type="text"
            value={companyInfo.companyAddress}
            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyAddress: e.target.value }))}
            required
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Company phone (optional)
          <input
            type="tel"
            value={companyInfo.companyPhone}
            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyPhone: e.target.value }))}
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="+1 (555) 000-0000"
          />
        </label>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep('basic')}
          className="text-sm font-medium text-muted hover:text-primary"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </form>
  );

  const stepTitle = () => {
    if (step === 'clientType') return 'Register as a new client';
    if (step === 'basic') return 'Tell us about you';
    return 'Share your company details';
  };

  const stepSubtitle = () => {
    if (step === 'clientType') return 'Choose whether you are purchasing as a business or an individual.';
    if (step === 'basic') return 'We will use this information to create your secure account.';
    return 'Provide the business information required for B2B access.';
  };

  const progress = () => {
    if (!clientType) return 0;
    const totalSteps = clientType === 'B2B' ? 3 : 2;
    const currentIndex = step === 'clientType' ? 0 : step === 'basic' ? 1 : 2;
    return Math.round(((currentIndex + 1) / totalSteps) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 py-16 px-4">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Client onboarding</p>
          <h1 className="text-2xl font-semibold text-slate-900">{stepTitle()}</h1>
          <p className="text-sm text-muted">{stepSubtitle()}</p>
          {clientType && (
            <div className="mx-auto h-2 w-full max-w-xs rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress()}%` }}
              />
            </div>
          )}
        </div>

        {step === 'clientType' && renderClientTypeStep()}
        {step === 'basic' && renderBasicInfoStep()}
        {step === 'company' && renderCompanyStep()}
      </div>
    </div>
  );
};
