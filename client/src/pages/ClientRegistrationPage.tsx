import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi, type ClientRegistrationPayload } from '../api/clients';
import { authApi } from '../api/auth';
import { useAuth } from '../context/useAuth';
import type { ClientType } from '../types/api';

type RegistrationStep = 'clientType' | 'basicInfo' | 'companyInfo' | 'verification' | 'success';

const initialBasicInfo = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const initialCompanyInfo = {
  companyName: '',
  companyAddress: '',
  companyPhone: '',
};

export const ClientRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [step, setStep] = useState<RegistrationStep>('clientType');
  const [clientType, setClientType] = useState<ClientType | null>(null);
  const [basicInfo, setBasicInfo] = useState(initialBasicInfo);
  const [companyInfo, setCompanyInfo] = useState(initialCompanyInfo);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationContext, setVerificationContext] = useState<{ email: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isB2B = useMemo(() => clientType === 'B2B', [clientType]);

  const handleClientTypeSelection = (type: ClientType) => {
    setClientType(type);
    setStep('basicInfo');
    setError(null);
    setStatus(null);
  };

  const handleBasicInfoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientType) return;

    if (basicInfo.password !== basicInfo.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isB2B) {
      setStep('companyInfo');
      setError(null);
      setStatus(null);
      return;
    }

    await submitRegistration();
  };

  const handleCompanyInfoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitRegistration();
  };

  const submitRegistration = async () => {
    if (!clientType) return;

    const payload: ClientRegistrationPayload = {
      clientType,
      basicInfo: {
        fullName: basicInfo.fullName.trim(),
        email: basicInfo.email.trim(),
        password: basicInfo.password,
      },
    };

    if (clientType === 'B2B') {
      payload.companyInfo = {
        companyName: companyInfo.companyName.trim(),
        companyAddress: companyInfo.companyAddress.trim(),
        companyPhone: companyInfo.companyPhone.trim(),
      };
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await clientsApi.register(payload);
      setVerificationContext({ email: response.email, expiresAt: response.expiresAt });
      setStep('verification');
      setStatus(
        response.previewCode
          ? `We have emailed you a 6-digit verification code. Test code: ${response.previewCode}`
          : 'We have emailed you a 6-digit verification code.'
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verificationContext) return;

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const { user } = await authApi.verifyEmail({
        email: verificationContext.email,
        code: verificationCode.trim(),
      });
      if (user) {
        setUser(user);
      }
      setStatus('Verification successful! Redirecting to your account...');
      setStep('success');
      setTimeout(() => {
        navigate('/account');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('clientType');
    setClientType(null);
    setBasicInfo(initialBasicInfo);
    setCompanyInfo(initialCompanyInfo);
    setVerificationCode('');
    setVerificationContext(null);
    setError(null);
    setStatus(null);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'clientType':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-900">Register as a client</h2>
            <p className="text-sm text-slate-600">
              Select the option that best describes you. Business (B2B) clients will be asked for company details on
              the next step.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleClientTypeSelection('C2B')}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span className="block text-lg font-semibold text-slate-900">Consumer (C2B)</span>
                <span className="mt-2 block text-sm text-slate-600">
                  Shop directly with us as an individual consumer.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleClientTypeSelection('B2B')}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span className="block text-lg font-semibold text-slate-900">Business (B2B)</span>
                <span className="mt-2 block text-sm text-slate-600">
                  Provide company details to unlock business pricing and invoicing.
                </span>
              </button>
            </div>
          </div>
        );
      case 'basicInfo':
        return (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Your details</h2>
              <p className="text-sm text-slate-600">
                We&apos;ll use these details to create your account and send the verification code.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Full name
                <input
                  type="text"
                  required
                  value={basicInfo.fullName}
                  onChange={(e) => setBasicInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Email
                <input
                  type="email"
                  required
                  value={basicInfo.email}
                  onChange={(e) => setBasicInfo((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Password
                  <input
                    type="password"
                    required
                    value={basicInfo.password}
                    onChange={(e) => setBasicInfo((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Confirm password
                  <input
                    type="password"
                    required
                    value={basicInfo.confirmPassword}
                    onChange={(e) => setBasicInfo((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={resetFlow}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Start over
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {isB2B ? 'Next: Company details' : loading ? 'Submitting...' : 'Create account'}
              </button>
            </div>
          </form>
        );
      case 'companyInfo':
        return (
          <form onSubmit={handleCompanyInfoSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Company information</h2>
              <p className="text-sm text-slate-600">Provide your company details so we can finalise your B2B account.</p>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Company name
                <input
                  type="text"
                  required
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Company address
                <input
                  type="text"
                  required
                  value={companyInfo.companyAddress}
                  onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyAddress: e.target.value }))}
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
                />
              </label>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('basicInfo')}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Create account'}
              </button>
            </div>
          </form>
        );
      case 'verification':
        return (
          <form onSubmit={handleVerificationSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Verify your email</h2>
              <p className="text-sm text-slate-600">
                Enter the 6-digit code we sent to {verificationContext?.email}. The code expires within 15 minutes.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Verification code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="h-11 rounded-xl border border-border bg-white px-4 text-center text-lg tracking-[0.5rem] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={resetFlow}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Restart registration
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify and continue'}
              </button>
            </div>
          </form>
        );
      case 'success':
        return (
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">You&apos;re all set!</h2>
            <p className="text-sm text-slate-600">
              We&apos;re redirecting you to your account dashboard. You can start exploring the catalogue once the page
              loads.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Client Registration</h1>
          <p className="mt-2 text-sm text-slate-600">
            Complete the guided steps to create your account. You can return to the{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              login page
            </button>{' '}
            at any time.
          </p>
        </div>

        {status && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {renderStepContent()}
      </div>
    </div>
  );
};

