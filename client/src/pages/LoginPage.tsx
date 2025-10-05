import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SiteLayout } from '../components/layout/SiteLayout';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';
import { cn } from '../utils/cn';

type SignupStep = 0 | 1 | 2;

type SignupData = {
  accountType: 'B2B' | 'C2B';
  fullName: string;
  companyName: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const defaultSignup: SignupData = {
  accountType: 'B2B',
  fullName: '',
  companyName: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: '',
};

type LoginPageProps = {
  initialTab?: 'login' | 'signup';
};

export const LoginPage: React.FC<LoginPageProps> = ({ initialTab = 'login' }) => {
  const { login, register: registerUser } = useAuth();
  const { items, loadFromServer } = useCart();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupStep, setSignupStep] = useState<SignupStep>(0);
  const [signupData, setSignupData] = useState<SignupData>(defaultSignup);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetSignup = () => {
    setSignupData(defaultSignup);
    setSignupStep(0);
    setSignupError(null);
    setSignupLoading(false);
    setPhoneValue({ countryCode: '+1', number: '' });
  };

  const showSignup = () => {
    setActiveTab('signup');
    resetSignup();
  };

  const showLogin = () => {
    setActiveTab('login');
    setLoginError(null);
    setLoginLoading(false);
  };

  const switchTab = (tab: 'login' | 'signup') => {
    if (tab === 'login') {
      showLogin();
    } else {
      showSignup();
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login({
        username: loginUsername,
        password: loginPassword,
        guestCart: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      await loadFromServer();
    } catch (error) {
      console.error(error);
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupStep0 = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [firstName, ...lastNameParts] = signupData.fullName.trim().split(' ');
    if (!firstName || lastNameParts.length === 0) {
      setSignupError('Please enter your full name (first and last name).');
      return;
    }
    if (signupData.accountType === 'B2B' && !signupData.companyName.trim()) {
      setSignupError('Company name is required for business accounts.');
      return;
    }
    if (!phoneValue.number) {
      setSignupError('Provide a contact phone number.');
      return;
    }
    setSignupError(null);
    setSignupStep(1);
  };

  const handleSignupCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signupData.username.trim()) {
      setSignupError('Please enter an email address.');
      return;
    }
    if (signupData.password.length < 8) {
      setSignupError('Password must be at least 8 characters.');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setSignupLoading(true);
    setSignupError(null);
    try {
      await registerUser({
        name: signupData.fullName,
        username: signupData.username.toLowerCase(),
        password: signupData.password,
        guestCart: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      await loadFromServer();
      setSignupStep(2);
    } catch (error) {
      console.error(error);
      setSignupError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const steps = ['Business details', 'Credentials', 'Complete'] as const;

  const renderLoginForm = () => (
    <form className="space-y-4" onSubmit={handleLogin}>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Username</span>
        <input
          type="text"
          value={loginUsername}
          onChange={(event) => setLoginUsername(event.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          className="h-12 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Password</span>
        <div className="relative">
          <input
            type={showLoginPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowLoginPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary-dark"
            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
          >
            {showLoginPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <div className="flex items-center justify-between text-xs text-muted">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border border-border text-primary focus:ring-primary/30"
          />
          Remember me
        </label>
        <button type="button" className="font-medium text-primary hover:text-primary-dark">
          Forgot password?
        </button>
      </div>
      {loginError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {loginError}
        </div>
      )}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loginLoading}
      >
        {loginLoading ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-muted">
        Need an account?{' '}
        <button type="button" className="font-semibold text-primary hover:text-primary-dark" onClick={showSignup}>
          Register now
        </button>
      </p>
    </form>
  );

  const renderSignupStep0 = () => (
    <form className="space-y-4" onSubmit={handleSignupStep0}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['B2B', 'C2B'] as const).map((type) => {
          const isActive = signupData.accountType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSignupData((prev) => ({ ...prev, accountType: type }))}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium transition',
                isActive ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border bg-white text-slate-600 hover:border-primary hover:text-primary'
              )}
            >
              {type === 'B2B' ? 'Business account' : 'Personal account'}
            </button>
          );
        })}
      </div>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Full name</span>
        <input
          type="text"
          value={signupData.fullName}
          onChange={(event) => setSignupData((prev) => ({ ...prev, fullName: event.target.value }))}
          placeholder="First Last"
          className="h-12 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
      </label>
      {signupData.accountType === 'B2B' && (
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span>Company name</span>
          <input
            type="text"
            value={signupData.companyName}
            onChange={(event) => setSignupData((prev) => ({ ...prev, companyName: event.target.value }))}
            placeholder="Your business or trade name"
            className="h-12 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      )}
      <div className="space-y-2 text-sm text-slate-600">
        <span>Contact phone</span>
        <PhoneNumberInput
          value={phoneValue}
          onChange={(val) => {
            setPhoneValue(val);
            setSignupData((prev) => ({ ...prev, phone: `${val.countryCode}${val.number}` }));
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Step 1 of 2</span>
        <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20">
          Continue
        </button>
      </div>
    </form>
  );

  const renderSignupStep1 = () => (
    <form className="space-y-4" onSubmit={handleSignupCredentials}>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Email address</span>
        <input
          type="email"
          value={signupData.username}
          onChange={(event) => setSignupData((prev) => ({ ...prev, username: event.target.value }))}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-12 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Password</span>
        <div className="relative">
          <input
            type={showSignupPassword ? 'text' : 'password'}
            value={signupData.password}
            onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Create a password"
            className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowSignupPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary-dark"
          >
            {showSignupPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span>Confirm password</span>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={signupData.confirmPassword}
            onChange={(event) => setSignupData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            placeholder="Confirm your password"
            className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary-dark"
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      <div className="flex justify-between gap-3">
        <button
          type="button"
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
          onClick={() => setSignupStep(0)}
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={signupLoading}
        >
          {signupLoading ? 'Creating...' : 'Create account'}
        </button>
      </div>
    </form>
  );

  const renderSignupStep2 = () => (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-white">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Account created!</h2>
      <p className="max-w-sm text-sm text-muted">You can now sign in using your new credentials.</p>
      <button
        type="button"
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
        onClick={() => {
          showLogin();
          resetSignup();
        }}
      >
        Go to login
      </button>
    </div>
  );

  const renderSignup = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs font-medium text-muted">
        {steps.map((label, index) => {
          const isActive = signupStep === index;
          const isComplete = signupStep > index;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold',
                  isComplete ? 'border-primary bg-primary text-white' : isActive ? 'border-primary text-primary' : 'border-border text-muted'
                )}
              >
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={cn('text-xs font-medium', isActive || isComplete ? 'text-slate-900' : 'text-muted')}>
                {label}
              </span>
              {index < steps.length - 1 && <span className="hidden w-8 border-t border-dashed border-border sm:block" />}
            </div>
          );
        })}
      </div>
      {signupError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {signupError}
        </div>
      )}
      {signupStep === 0 && renderSignupStep0()}
      {signupStep === 1 && renderSignupStep1()}
      {signupStep === 2 && renderSignupStep2()}
      {signupStep !== 2 && (
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <button type="button" className="font-semibold text-primary hover:text-primary-dark" onClick={showLogin}>
            Sign in
          </button>
        </p>
      )}
    </div>
  );
  const isLogin = activeTab === 'login';

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-md">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="hidden h-full flex-col justify-between bg-gradient-to-br from-primary via-primary-dark to-slate-900 p-10 text-white lg:flex">
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">SALAH Store</p>
                <h2 className="text-3xl font-semibold leading-tight">Streamline industrial sourcing</h2>
                <p className="max-w-sm text-sm text-white/80">
                  Centralize purchasing for locksmiths, fleets, and maintenance teams with transparent pricing and rapid fulfillment.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li>- Consolidated B2B account management</li>
                <li>- Managed order workflows and approvals</li>
                <li>- Volume pricing and allocation tracking</li>
                <li>- Dedicated support from industry specialists</li>
              </ul>
            </div>
            <div className="p-8 sm:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {isLogin ? 'Sign in' : 'Create an account'}
                  </h1>
                  <p className="text-sm text-muted">
                    {isLogin
                      ? 'Access your orders, approvals, and team settings.'
                      : 'Unlock wholesale pricing and priority access to inventory.'}
                  </p>
                </div>
                <div className="flex rounded-full border border-border bg-background p-1 text-sm font-medium">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-full px-4 py-2 transition',
                      isLogin ? 'bg-white text-slate-900 shadow' : 'text-muted hover:text-slate-900'
                    )}
                    onClick={() => switchTab('login')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-full px-4 py-2 transition',
                      !isLogin ? 'bg-white text-slate-900 shadow' : 'text-muted hover:text-slate-900'
                    )}
                    onClick={() => switchTab('signup')}
                  >
                    Register
                  </button>
                </div>
              </div>
              <div className="mt-8">
                {isLogin ? renderLoginForm() : renderSignup()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};
