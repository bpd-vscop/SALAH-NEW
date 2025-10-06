import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';

type SignupStep = 0 | 1 | 2 | 3;

type SignupData = {
  accountType: 'B2B' | 'C2B';
  firstName: string;
  lastName: string;
  companyName: string;
  companyWebsite: string;
  taxId: string;
  businessType: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const defaultSignup: SignupData = {
  accountType: 'B2B',
  firstName: '',
  lastName: '',
  companyName: '',
  companyWebsite: '',
  taxId: '',
  businessType: '',
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login({
        username: loginUsername,
        password: loginPassword,
        guestCart: items.map((item: CartLine) => ({ productId: item.productId, quantity: item.quantity })),
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
    if (!signupData.firstName.trim()) {
      setSignupError('First name is required.');
      return;
    }
    if (!signupData.lastName.trim()) {
      setSignupError('Last name is required.');
      return;
    }
    setSignupError(null);
    setSignupStep(1);
  };

  const handleSignupStep1B2B = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signupData.companyName.trim()) {
      setSignupError('Company name is required.');
      return;
    }
    if (!signupData.businessType.trim()) {
      setSignupError('Business type is required.');
      return;
    }
    setSignupError(null);
    setSignupStep(2);
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
        name: `${signupData.firstName} ${signupData.lastName}`,
        username: signupData.username.toLowerCase(),
        password: signupData.password,
        guestCart: items.map((item: CartLine) => ({ productId: item.productId, quantity: item.quantity })),
      });
      await loadFromServer();
      setSignupStep(isB2B ? 3 : 2);
    } catch (error) {
      console.error(error);
      setSignupError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const isB2B = signupData.accountType === 'B2B';
  const stepCount = isB2B ? 4 : 3;

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {show ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      )}
    </svg>
  );

  return (
    <div className="min-h-screen flex items-start justify-center pt-16 pb-8 px-4 relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Main Card */}
      <div className="relative w-full max-w-md z-10 bg-white/60 backdrop-blur-md border border-white shadow-2xl rounded-2xl overflow-hidden">
        {/* Gradient Blobs */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-60 h-40 rounded-full bg-yellow-500 opacity-15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-60 h-40 rounded-full bg-red-700 opacity-15 blur-[100px]" />

        {/* Card Content */}
        <div className="pt-12 px-12 bg-transparent flex flex-col gap-4 min-h-auto">
          {/* Logo */}
          <div className="flex items-center flex-col gap-1 mb-2">
            <img
              src="https://i.postimg.cc/nVjjhfsz/qt-q-95.png"
              alt="ULKS Logo"
              className="h-16 w-auto mx-auto"
            />
          </div>

          {/* Tabs */}
          <div className="relative grid grid-cols-2 gap-1 p-4 rounded-full bg-white/70 border border-gray-200 w-full max-w-xs mx-auto">
            {/* Sliding Background */}
            <div
              className={`absolute top-1 left-1 rounded-full z-0 transition-transform duration-300 ease-in-out ${
                activeTab === 'signup' ? 'translate-x-[calc(100%+0.5rem)]' : ''
              }`}
              style={{
                width: 'calc(50% - 0.375rem)',
                height: 'calc(100% - 0.5rem)',
                background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                boxShadow: '0 18px 30px rgba(160, 11, 11, 0.22)',
              }}
            />
            <button
              type="button"
              onClick={showLogin}
              className={`translate-x-[calc(0%-0.5rem)] text-sm font-medium py-2 rounded-full transition-colors relative z-10 ${
                activeTab === 'login' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={showSignup}
              className={`translate-x-[calc(0%+0.5rem)] text-sm font-medium py-2 rounded-full transition-colors relative z-10 ${
                activeTab === 'signup' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="relative" style={{ minHeight: '460px' }}>
            {/* Login Panel */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'login'
                  ? 'opacity-100 translate-x-0 relative'
                  : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'
              }`}
            >
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Welcome to ULKS</h1>

              <form className="w-full self-center grid gap-[1.1rem]" onSubmit={handleLogin}>
                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Email Address</span>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value.toLowerCase())}
                    placeholder="you@example.com"
                    autoComplete="username"
                    required
                    className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                  />
                </label>

                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Password</span>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 pr-11 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon show={showLoginPassword} />
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-red-700"
                    />
                    Remember me
                  </label>
                  <span className="text-slate-600 cursor-pointer hover:text-red-700 transition-colors">Forgot password?</span>
                </div>

                {loginError && (
                  <div className="w-full self-center px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                    boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loginLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loginLoading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!loginLoading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!loginLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                    }
                  }}
                >
                  {loginLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="text-center flex flex-col items-center justify-center gap-2 text-sm text-gray-600 m-8">
                <span>
                  Don&apos;t have an account?{' '}
                  <button type="button" className="text-orange-600 hover:text-red-700 font-medium cursor-pointer" onClick={showSignup}>
                    Create one
                  </button>
                </span>
                <span className="text-xs text-slate-400">© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved.</span>
              </div>
            </div>

            {/* Signup Panel */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'signup'
                  ? 'opacity-100 translate-x-0 relative'
                  : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'
              }`}
            >
              <h1 className="text-2xl font-bold text-gray-900 text-center">Create your ULKS Account</h1>

              {/* Step Indicators */}
              <div className="flex justify-center items-center gap-2.5 mt-2 mb-1">
                {Array.from({ length: stepCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all duration-400 ease-in-out ${
                      signupStep === i
                        ? 'w-[34px] h-[34px] text-white scale-105'
                        : 'w-2 h-2 bg-slate-400/30 text-transparent'
                    }`}
                    style={
                      signupStep === i
                        ? {
                            background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                            boxShadow: '0 6px 16px rgba(160, 11, 11, 0.3)',
                          }
                        : undefined
                    }
                  >
                    {signupStep === i && i + 1}
                  </div>
                ))}
              </div>

              {signupError && (
                <div className="w-full self-center px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold mt-4">
                  {signupError}
                </div>
              )}

              <div className="relative overflow min-h-auto mt-2">
                {/* Step 0: Personal Info */}
                {signupStep === 0 && (
                  <form className="w-full self-center grid gap-4" onSubmit={handleSignupStep0}>
                    {/* Account Type */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['B2B', 'C2B'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSignupData((prev) => ({ ...prev, accountType: type }))}
                          className={`rounded-full px-3.5 py-3 mt-1 border font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
                            signupData.accountType === type
                              ? 'border-transparent text-white scale-[1.01]'
                              : 'border-slate-400/40 bg-white/70 text-slate-600 hover:border-slate-400/55 hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md'
                          }`}
                          style={
                            signupData.accountType === type
                              ? {
                                  background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                                  boxShadow: '0 14px 24px rgba(160, 11, 11, 0.22)',
                                }
                              : undefined
                          }
                        >
                          {type === 'B2B' ? 'Business (B2B)' : 'Individual (C2B)'}
                        </button>
                      ))}
                    </div>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>First Name</span>
                      <input
                        type="text"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="First name"
                        required
                        className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Last Name</span>
                      <input
                        type="text"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last name"
                        required
                        className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Phone Number</span>
                      <PhoneNumberInput
                        value={phoneValue}
                        onChange={(val) => {
                          setPhoneValue(val);
                          setSignupData((prev) => ({ ...prev, phone: `${val.countryCode}${val.number}` }));
                        }}
                        placeholder="1234567890"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out"
                      style={{
                        background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                        boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                        transform: 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                      }}
                    >
                      Next
                    </button>
                  </form>
                )}

                {/* Step 1: Company Info (B2B) or Credentials (C2B) */}
                {signupStep === 1 &&
                  (isB2B ? (
                    <form className="w-full self-center grid gap-[1.1rem]" onSubmit={handleSignupStep1B2B}>
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Company Name</span>
                        <input
                          type="text"
                          value={signupData.companyName}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, companyName: e.target.value }))}
                          placeholder="Your company name"
                          required
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Business Type</span>
                        <input
                          type="text"
                          value={signupData.businessType}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, businessType: e.target.value }))}
                          placeholder="e.g. LLC, Sole Proprietor"
                          required
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Tax ID (optional)</span>
                        <input
                          type="text"
                          value={signupData.taxId}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, taxId: e.target.value }))}
                          placeholder="Tax ID"
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Company Website (optional)</span>
                        <input
                          type="text"
                          value={signupData.companyWebsite}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, companyWebsite: e.target.value }))}
                          placeholder="https://example.com"
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <div className="flex justify-between gap-4 items-center">
                        <button
                          type="button"
                          onClick={() => setSignupStep(0)}
                          className="border-none bg-slate-900/8 text-slate-600 px-5 py-3 rounded-full font-semibold cursor-pointer transition-all duration-200 ease-in-out hover:bg-slate-900/12 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out"
                          style={{
                            background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                            boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                            transform: 'translateY(0)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form className="w-full self-center grid gap-[1.1rem]" onSubmit={handleSignupCredentials}>
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Email Address</span>
                        <input
                          type="email"
                          value={signupData.username}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, username: e.target.value }))}
                          placeholder="you@example.com"
                          required
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Password</span>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={signupData.password}
                            onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Create a password"
                            required
                            className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 pr-11 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showSignupPassword} />
                          </button>
                        </div>
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Confirm Password</span>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your password"
                            required
                            className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 pr-11 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showConfirmPassword} />
                          </button>
                        </div>
                      </label>

                      <div className="flex justify-between gap-4 items-center">
                        <button
                          type="button"
                          onClick={() => setSignupStep(0)}
                          className="border-none bg-slate-900/8 text-slate-600 px-5 py-3 rounded-full font-semibold cursor-pointer transition-all duration-200 ease-in-out hover:bg-slate-900/12 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={signupLoading}
                          className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed"
                          style={{
                            background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                            boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                            transform: 'translateY(0)',
                          }}
                          onMouseEnter={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                            }
                          }}
                          onMouseDown={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                            }
                          }}
                          onMouseUp={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                            }
                          }}
                        >
                          {signupLoading ? 'Creating…' : 'Create Account'}
                        </button>
                      </div>
                    </form>
                  ))}

                {/* Step 2: Credentials (B2B) or Success (C2B) */}
                {signupStep === 2 &&
                  (isB2B ? (
                    <form className="w-full self-center grid gap-[1.1rem]" onSubmit={handleSignupCredentials}>
                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Email Address</span>
                        <input
                          type="email"
                          value={signupData.username}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, username: e.target.value }))}
                          placeholder="you@example.com"
                          required
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Password</span>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={signupData.password}
                            onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Create a password"
                            required
                            className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 pr-11 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showSignupPassword} />
                          </button>
                        </div>
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Confirm Password</span>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your password"
                            required
                            className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 pr-11 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showConfirmPassword} />
                          </button>
                        </div>
                      </label>

                      <div className="flex justify-between gap-4 items-center">
                        <button
                          type="button"
                          onClick={() => setSignupStep(1)}
                          className="border-none bg-slate-900/8 text-slate-600 px-5 py-3 rounded-full font-semibold cursor-pointer transition-all duration-200 ease-in-out hover:bg-slate-900/12 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={signupLoading}
                          className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed"
                          style={{
                            background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                            boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                            transform: 'translateY(0)',
                          }}
                          onMouseEnter={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                            }
                          }}
                          onMouseDown={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                            }
                          }}
                          onMouseUp={(e) => {
                            if (!signupLoading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                            }
                          }}
                        >
                          {signupLoading ? 'Creating…' : 'Create Account'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center pt-6 pr-4 pb-0 pl-4">
                      <div
                        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold mb-4 text-white"
                        style={{ background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)' }}
                      >
                        ✔
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Account created!</h2>
                      <p className="text-gray-600 mb-6">You can now sign in using your new credentials.</p>
                      <button
                        type="button"
                        onClick={() => {
                          showLogin();
                          resetSignup();
                        }}
                        className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out"
                        style={{
                          background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                          boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                          transform: 'translateY(0)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                        }}
                      >
                        Go to Login
                      </button>
                    </div>
                  ))}

                {/* Step 3: Success (B2B) */}
                {signupStep === 3 && (
                  <div className="text-center pt-6 pr-4 pb-0 pl-4">
                    <div
                      className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold mb-4 text-white"
                      style={{ background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)' }}
                    >
                      ✔
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Account created!</h2>
                    <p className="text-gray-600 mb-6">You can now sign in using your new credentials.</p>
                    <button
                      type="button"
                      onClick={() => {
                        showLogin();
                        resetSignup();
                      }}
                      className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out"
                      style={{
                        background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                        boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                        transform: 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                      }}
                    >
                      Go to Login
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center flex flex-col items-center justify-center gap-2 text-sm text-gray-600 m-8">
                <span>
                  Already have an account?{' '}
                  <button type="button" className="text-orange-600 hover:text-red-700 font-medium cursor-pointer" onClick={showLogin}>
                    Sign in
                  </button>
                </span>
                <span className="text-xs text-slate-400">© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};