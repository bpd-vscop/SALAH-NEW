import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { clientsApi } from '../api/clients';
import { authApi } from '../api/auth';
import { useCart } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';
import { BusinessTypeSelect } from '../components/common/BusinessTypeSelect';
import { meetsPasswordPolicy, PASSWORD_COMPLEXITY_MESSAGE, evaluatePasswordStrength } from '../utils/password';
import { isBusinessTypeOption, type BusinessTypeOption } from '../data/businessTypes';

const LoadingDots = ({ dotClass = 'bg-white' }: { dotClass?: string }) => (
  <span className="inline-flex gap-1 ml-2">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce`}
        style={{ animationDelay: `${index * 0.15}s` }}
      />
    ))}
  </span>
);

type LocationState = {
  from?: {
    pathname: string;
  };
};

type SignupStep = 0 | 1 | 2 | 3 | 4;

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
  const { login, refresh } = useAuth();
  const { items, loadFromServer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  type TabType = 'login' | 'signup' | 'reset-password';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Password reset state
  type PasswordResetStep = 'request' | 'verify-code' | 'new-password' | 'success';
  const [passwordResetStep, setPasswordResetStep] = useState<PasswordResetStep>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [handledResetToken, setHandledResetToken] = useState<string | null>(null);

const [signupStep, setSignupStep] = useState<SignupStep>(0);
const [signupData, setSignupData] = useState<SignupData>(defaultSignup);
const [signupBusinessTypeCustom, setSignupBusinessTypeCustom] = useState(false);
const [signupError, setSignupError] = useState<string | null>(null);
const [signupLoading, setSignupLoading] = useState(false);
const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' }); // Default to United States
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification step state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const signupPasswordStrength = evaluatePasswordStrength(signupData.password);
  const resetPasswordStrength = evaluatePasswordStrength(newPassword);
  const signupConfirmMismatch =
    signupData.confirmPassword.length > 0 && signupData.password !== signupData.confirmPassword;
  const signupPasswordInputClasses = [
    'rounded-xl',
    'border',
    signupPasswordStrength.borderClass,
    'bg-white/95',
    'px-3.5',
    'py-3',
    'pr-11',
    'text-[0.95rem]',
    'transition-all',
    'duration-250',
    'ease-in-out',
    'focus:outline-none',
    'w-full',
    signupPasswordStrength.focusClass,
  ].join(' ');
  const resetPasswordInputClasses = [
    'rounded-xl',
    'border',
    resetPasswordStrength.borderClass,
    'bg-white/95',
    'px-3.5',
    'py-3',
    'pr-11',
    'text-[0.95rem]',
    'transition-all',
    'duration-250',
    'ease-in-out',
    'focus:outline-none',
    'w-full',
    resetPasswordStrength.focusClass,
  ].join(' ');
  const signupConfirmInputClasses = [
    'rounded-xl',
    'border',
    signupConfirmMismatch ? 'border-rose-500' : 'border-slate-400/45',
    'bg-white/95',
    'px-3.5',
    'py-3',
    'pr-11',
    'text-[0.95rem]',
    'transition-all',
    'duration-250',
    'ease-in-out',
    'focus:outline-none',
    'w-full',
    signupConfirmMismatch ? 'focus:ring-4 focus:ring-rose-500/25 focus:border-rose-600' : 'focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12',
  ].join(' ');
  const resetConfirmMismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
const resetConfirmInputClasses = [
  'rounded-xl',
  'border',
  resetConfirmMismatch ? 'border-rose-500' : 'border-slate-400/45',
    'bg-white/95',
    'px-3.5',
    'py-3',
    'pr-11',
    'text-[0.95rem]',
    'transition-all',
    'duration-250',
    'ease-in-out',
    'focus:outline-none',
    'w-full',
  resetConfirmMismatch ? 'focus:ring-4 focus:ring-rose-500/25 focus:border-rose-600' : 'focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12',
].join(' ');

useEffect(() => {
  if (!signupData.businessType) {
    return;
  }
  if (!isBusinessTypeOption(signupData.businessType) && !signupBusinessTypeCustom) {
    setSignupBusinessTypeCustom(true);
  }
}, [signupData.businessType, signupBusinessTypeCustom]);

useEffect(() => {
  if (signupData.accountType !== 'B2B') {
    setSignupBusinessTypeCustom(false);
  }
}, [signupData.accountType]);

const { token: resetTokenParam } = useParams<{ token?: string }>();

  useEffect(() => {
    if (!resetTokenParam || handledResetToken === resetTokenParam) {
      return;
    }

    setHandledResetToken(resetTokenParam);
    setActiveTab('reset-password');
    setPasswordResetStep('new-password');
    setResetError(null);
    setResetLoading(true);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');

    authApi
      .validateResetToken(resetTokenParam)
      .then((response) => {
        if (response.valid) {
          setResetToken(response.token || resetTokenParam);
        } else {
          setResetError('Invalid or expired reset link. Please request a new reset email.');
          setPasswordResetStep('request');
          setResetToken('');
        }
      })
      .catch(() => {
        setResetError('Invalid or expired reset link. Please request a new reset email.');
        setPasswordResetStep('request');
        setResetToken('');
      })
      .finally(() => {
        setResetLoading(false);
      });
  }, [resetTokenParam, handledResetToken]);

  const resetSignup = () => {
    setSignupData(defaultSignup);
    setSignupStep(0);
    setSignupBusinessTypeCustom(false);
    setSignupError(null);
    setSignupLoading(false);
    setPhoneValue({ countryCode: '+1', number: '' });
    setVerificationEmail('');
    setVerificationCode('');
    setResendCooldown(0);
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

  const showPasswordReset = () => {
    // Pre-fill email from login form if available
    const candidate = loginUsername.trim();
    if (candidate.includes('@')) {
      setResetEmail(candidate.toLowerCase());
    }
    setActiveTab('reset-password');
    setPasswordResetStep('request');
    setResetError(null);
    setResetLoading(false);
    setResetCode('');
    setResetToken('');
    if (!resetTokenParam) {
      setHandledResetToken(null);
    }
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const guestCartItems = Array.isArray(items) ? items : [];
      const user = await login({
        username: loginUsername,
        password: loginPassword,
        guestCart: guestCartItems.map((item: CartLine) => ({ productId: item.productId, quantity: item.quantity })),
      });
      // Redirect based on role (super_admin/admin/staff -> dashboard, client -> account or verification)
      if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'staff') {
        await loadFromServer();
        const from = (location.state as LocationState)?.from?.pathname;
        navigate(from && from !== '/login' ? from : '/admin', { replace: true });
      } else {
        if (user.isEmailVerified === false) {
          // Show verification in signup tab
          setActiveTab('signup');
          setVerificationEmail(user.email || loginUsername);
          setSignupData({ ...signupData, accountType: user.clientType || 'C2B' });
          const isUserB2B = user.clientType === 'B2B';
          setSignupStep(isUserB2B ? 3 : 2); // Verification step
        } else {
          await loadFromServer();
          navigate('/account', { replace: true });
        }
      }
    } catch (error: any) {
      console.error(error);
      // Check if this is an email verification error with verification data
      if (error?.status === 403 && error?.details) {
        const details = error.details;
        if (details.requiresVerification && details.email) {
          // Show verification in signup tab
          setActiveTab('signup');
          setVerificationEmail(details.email);
          setSignupData({ ...signupData, accountType: details.clientType || 'C2B' });
          const isUserB2B = details.clientType === 'B2B';
          setSignupStep(isUserB2B ? 3 : 2); // Verification step
          setLoginError(null); // Clear login error as we're showing verification
          return;
        }
      }
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Password Reset Handlers
  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetLoading(true);
    setResetError(null);
    try {
      await authApi.forgotPassword({ email: resetEmail.trim() });
      setPasswordResetStep('verify-code');
    } catch (error) {
      console.error(error);
      setResetError(error instanceof Error ? error.message : 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetCode.trim().length !== 6) {
      setResetError('Enter the 6-digit code.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const result = await authApi.verifyResetCode({ email: resetEmail.trim(), code: resetCode.trim() });
      setResetToken(result.token);
      setPasswordResetStep('new-password');
    } catch (error) {
      console.error(error);
      setResetError(error instanceof Error ? error.message : 'Invalid or expired code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meetsPasswordPolicy(newPassword)) {
      setResetError(PASSWORD_COMPLEXITY_MESSAGE);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError(null);
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await authApi.resetPassword({ token: resetToken, newPassword });
      setPasswordResetStep('success');
    } catch (error) {
      console.error(error);
      setResetError(error instanceof Error ? error.message : 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const resetPasswordResetFlow = () => {
    if (resetTokenParam) {
      navigate('/login', { replace: true });
    }
    setActiveTab('login');
    setPasswordResetStep('request');
    setResetEmail('');
    setResetCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError(null);
    setResetLoading(false);
    if (!resetTokenParam) {
      setHandledResetToken(null);
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

  const handleSignupBusinessTypePresetSelect = (option: BusinessTypeOption) => {
    setSignupBusinessTypeCustom(false);
    setSignupData((prev) => ({ ...prev, businessType: option }));
  };

  const handleSignupEnableCustomBusinessType = () => {
    setSignupBusinessTypeCustom(true);
    setSignupData((prev) => ({ ...prev, businessType: '' }));
  };

  const handleSignupCustomBusinessTypeChange = (value: string) => {
    setSignupData((prev) => ({ ...prev, businessType: value }));
  };

  const handleSignupStep1B2B = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyName = signupData.companyName.trim();
    const businessType = signupData.businessType.trim();
    if (!companyName) {
      setSignupError('Company name is required.');
      return;
    }
    if (!businessType) {
      setSignupError('Business type is required.');
      return;
    }
    setSignupData((prev) => ({ ...prev, companyName, businessType }));
    setSignupError(null);
    setSignupStep(2);
  };

  const handleSignupCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signupData.username.trim()) {
      setSignupError('Please enter an email address.');
      return;
    }
    if (!meetsPasswordPolicy(signupData.password)) {
      setSignupError(PASSWORD_COMPLEXITY_MESSAGE);
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError(null);
      return;
    }

    setSignupLoading(true);
    setSignupError(null);
    try {
      const guestCartItems = Array.isArray(items) ? items : [];
      const companyName = signupData.companyName.trim();
      const businessType = signupData.businessType.trim();
      const taxId = signupData.taxId.trim();
      const companyWebsite = signupData.companyWebsite.trim();
      const companyPhone = signupData.phone.trim();
      const payload = {
        clientType: signupData.accountType,
        basicInfo: {
          fullName: `${signupData.firstName} ${signupData.lastName}`.trim(),
          email: signupData.username.toLowerCase(),
          password: signupData.password,
          phoneCode: phoneValue.countryCode,
          phoneNumber: phoneValue.number,
        },
        companyInfo:
          signupData.accountType === 'B2B'
            ? {
                companyName,
                businessType: businessType || undefined,
                taxId: taxId || undefined,
                companyWebsite: companyWebsite || undefined,
                companyPhone: companyPhone || undefined,
              }
            : undefined,
      } as const;

      const response = await clientsApi.register(payload);
      if (guestCartItems.length) {
        // store guest cart locally until verification completes
        console.info('Guest cart preserved until verification completes.');
      }

      // Move to verification step instead of navigating away
      setVerificationEmail(response.email);
      setSignupError(null);
      setSignupStep(isB2B ? 3 : 2); // Verification is step 3 for B2B, step 2 for C2B
    } catch (error) {
      console.error(error);
      setSignupError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setSignupError('Enter the 6-digit verification code.');
      return;
    }

    setVerificationLoading(true);
    setSignupError(null);

    try {
      await authApi.verifyEmail({
        email: verificationEmail,
        code: verificationCode.trim(),
      });

      await refresh();
      await loadFromServer();

      // Success - show success step
      setSignupStep(isB2B ? 4 : 3); // Success is step 4 for B2B, step 3 for C2B
    } catch (error) {
      console.error(error);
      setSignupError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !verificationEmail) return;

    setResendLoading(true);
    setSignupError(null);

    try {
      await authApi.resendVerificationCode({ email: verificationEmail });
      setResendCooldown(60);
      setSignupError(null);
    } catch (error) {
      console.error(error);
      setSignupError(error instanceof Error ? error.message : 'Unable to resend verification code right now.');
    } finally {
      setResendLoading(false);
    }
  };

  const isB2B = signupData.accountType === 'B2B';
  const stepCount = isB2B ? 5 : 4; // Steps include verification + success now

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
    <div className="min-h-screen flex items-center justify-center py-16 px-4 relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Main Card */}
      <div className="relative w-full max-w-md z-10 bg-white/60 backdrop-blur-md border border-white shadow-2xl rounded-2xl overflow-hidden mx-auto">
        {/* Gradient Blobs */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-60 h-40 rounded-full bg-yellow-500 opacity-15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-60 h-40 rounded-full bg-red-700 opacity-15 blur-[100px]" />

        {/* Card Content */}
        <div className="pt-12 px-6 sm:px-12 bg-transparent flex flex-col gap-4 min-h-auto">
          {/* Logo */}
          <div className="flex items-center flex-col gap-1 mb-2">
            <Link to="/">
              <img
                src="/logo.webp"
                alt="ULKS Logo"
                className="h-20 w-auto mx-auto cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* Tabs */}
          <div className="relative grid grid-cols-2 gap-1 p-2 rounded-full bg-white/70 border border-gray-200 w-full max-w-xs mx-auto">
            {/* Sliding Background */}
            <div
              className={`absolute top-1 left-1 rounded-full z-0 transition-all duration-300 ease-in-out ${
                activeTab === 'signup' ? 'translate-x-[calc(97.5%+0.5rem)]' : ''
              } ${activeTab === 'reset-password' ? 'opacity-0' : 'opacity-100'}`}
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
              className={`translate-x-[calc(0%-0.2rem)] text-sm font-medium py-2 rounded-full transition-colors relative z-10 ${
                activeTab === 'login' ? 'text-white' : 'text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={showSignup}
              className={`translate-x-[calc(0%+0.2rem)] text-sm font-medium py-2 rounded-full transition-colors relative z-10 ${
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

                <div className="flex items-center justify-end text-sm">
                  <button
                    type="button"
                    onClick={showPasswordReset}
                    className="text-slate-600 cursor-pointer hover:text-red-700 transition-colors bg-transparent border-none font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {loginError && (
                  <div className="w-full self-center px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold text-center">
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
                                <span className="text-xs text-slate-400">© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved <br></br> Powered by <a href="https://www.bpd.ma" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-red-700 font-medium">BP. Digital</a></span>
              </div>
            </div>

            {/* Password Reset Panel */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'reset-password'
                  ? 'opacity-100 translate-x-0 relative'
                  : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'
              }`}
            >
              {/* Step 1: Request Reset (Enter Email) */}
              {passwordResetStep === 'request' && (
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={resetPasswordResetFlow}
                    className="self-start mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 bg-transparent border-none cursor-pointer"
                  >
                    <span>←</span> Back to login
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Reset Password</h2>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    Enter your email address and we'll send you a code to reset your password.
                  </p>
                  <form className="flex-1 flex flex-col gap-4" onSubmit={handleForgotPassword}>
                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Email Address</span>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                        placeholder="you@example.com"
                        required
                        className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                      />
                    </label>

                    {resetError && (
                      <div className="px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold text-sm">
                        {resetError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed mt-auto"
                      style={{
                        background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                        boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                      }}
                    >
                      {resetLoading ? (
                        <span className="inline-flex items-center justify-center">
                          Sending
                          <LoadingDots />
                        </span>
                      ) : (
                        'Send Reset Email'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 2: Verify Code (Enter 6-digit code) */}
              {passwordResetStep === 'verify-code' && (
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => setPasswordResetStep('request')}
                    className="self-start mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 bg-transparent border-none cursor-pointer"
                  >
                    <span>←</span> Back
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Enter Code</h2>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    We sent a 6-digit code to <span className="font-semibold">{resetEmail}</span>
                  </p>
                  <form className="flex-1 flex flex-col gap-4" onSubmit={handleVerifyResetCode}>
                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Verification Code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                        required
                        className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-center text-lg tracking-[0.5rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                      />
                    </label>

                    {resetError && (
                      <div className="px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold text-sm">
                        {resetError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed mt-auto"
                      style={{
                        background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                        boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                      }}
                    >
                      {resetLoading ? (
                        <span className="inline-flex items-center justify-center">
                          Verifying
                          <LoadingDots />
                        </span>
                      ) : (
                        'Verify Code'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 3: New Password */}
              {passwordResetStep === 'new-password' && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">New Password</h2>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    Choose a new password for your account.
                  </p>
                  <form className="flex-1 flex flex-col gap-4" onSubmit={handleResetPassword}>
                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>New Password</span>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Strong password required"
                          required
                          className={resetPasswordInputClasses}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500"
                        >
                          <EyeIcon show={showNewPassword} />
                        </button>
                      </div>
                      {resetPasswordStrength.label && (
                        <p className={`text-xs font-semibold ${resetPasswordStrength.colorClass}`}>
                          {resetPasswordStrength.label}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</p>
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Confirm New Password</span>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          required
                          className={resetConfirmInputClasses}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500"
                        >
                          <EyeIcon show={showConfirmNewPassword} />
                        </button>
                      </div>
                      {resetConfirmMismatch && (
                        <p className="text-xs font-semibold text-rose-600">Passwords do not match.</p>
                      )}
                    </label>

                    {resetError && (
                      <div className="px-3 py-2.5 rounded-lg bg-red-600/12 text-red-700 font-semibold text-sm">
                        {resetError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed mt-auto"
                      style={{
                        background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                        boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                      }}
                    >
                      {resetLoading ? (
                        <span className="inline-flex items-center justify-center">
                          Resetting
                          <LoadingDots />
                        </span>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 4: Success */}
              {passwordResetStep === 'success' && (
                <div className="flex flex-col h-full items-center justify-center text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold mb-4 text-white"
                    style={{ background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)' }}
                  >
                    ✔
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                  <p className="text-gray-600 mb-6">
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>
                  <button
                    type="button"
                    onClick={resetPasswordResetFlow}
                    className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out"
                    style={{
                      background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                      boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                    }}
                  >
                    Go to Login
                  </button>
                </div>
              )}
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
                      <span>First Name <span className="text-red-600">*</span></span>
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
                      <span>Last Name <span className="text-red-600">*</span></span>
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
                      <span>Phone Number <span className="text-red-600">*</span></span>
                      <PhoneNumberInput
                        value={phoneValue}
                        onChange={(val) => {
                          setPhoneValue(val);
                          setSignupData((prev) => ({ ...prev, phone: `${val.countryCode}${val.number}` }));
                        }}
                        placeholder="1234567890"
                        required
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
                        <span>Company Name <span className="text-red-600">*</span></span>
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
                        <span>Business Type <span className="text-red-600">*</span></span>
                        <BusinessTypeSelect
                          value={
                            !signupBusinessTypeCustom && isBusinessTypeOption(signupData.businessType)
                              ? signupData.businessType
                              : ''
                          }
                          onSelect={handleSignupBusinessTypePresetSelect}
                          onSelectCustom={handleSignupEnableCustomBusinessType}
                          placeholder="e.g. LLC, Sole Proprietor"
                        />
                        {signupBusinessTypeCustom && (
                          <div className="grid gap-2 pt-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <input
                              type="text"
                              value={signupData.businessType}
                              onChange={(e) => handleSignupCustomBusinessTypeChange(e.target.value)}
                              placeholder="Enter your business type"
                              required
                              className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSignupBusinessTypeCustom(false);
                                setSignupData((prev) => ({ ...prev, businessType: '' }));
                              }}
                              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                            >
                              Choose preset
                            </button>
                          </div>
                        )}
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Tax ID</span>
                        <input
                          type="text"
                          value={signupData.taxId}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, taxId: e.target.value }))}
                          placeholder="Tax ID"
                          className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-[0.95rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-600">
                        <span>Company Website</span>
                        <input
                          type="text"
                          value={signupData.companyWebsite}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, companyWebsite: e.target.value }))}
                          pattern="^[^\s]+\.[^\s]+$"
                          placeholder="example.com"
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
                        <span>Email Address <span className="text-red-600">*</span></span>
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
                        <span>Password <span className="text-red-600">*</span></span>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={signupData.password}
                            onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Strong password required"
                            required
                            className={signupPasswordInputClasses}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showSignupPassword} />
                          </button>
                        </div>
                        {signupPasswordStrength.label && (
                          <p className={`text-xs font-semibold ${signupPasswordStrength.colorClass}`}>
                            {signupPasswordStrength.label}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</p>
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
                            className={signupConfirmInputClasses}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                          >
                            <EyeIcon show={showConfirmPassword} />
                          </button>
                        </div>
                        {signupConfirmMismatch && (
                          <p className="text-xs font-semibold text-rose-600">Passwords do not match.</p>
                        )}
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
                          {signupLoading ? (
                            <span className="inline-flex items-center justify-center">
                              Creating
                              <LoadingDots />
                            </span>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                      </div>
                    </form>
                  ))}

                {/* Step 2: Credentials (B2B only) */}
                {signupStep === 2 && isB2B && (
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
                          placeholder="Strong password required"
                          required
                          className={signupPasswordInputClasses}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-700"
                        >
                          <EyeIcon show={showSignupPassword} />
                        </button>
                      </div>
                      {signupPasswordStrength.label && (
                        <p className={`text-xs font-semibold ${signupPasswordStrength.colorClass}`}>
                          {signupPasswordStrength.label}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</p>
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
                        {signupLoading ? (
                          <span className="inline-flex items-center justify-center">
                            Creating
                            <LoadingDots />
                          </span>
                        ) : (
                          'Create Account'
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step: Email Verification (C2B at step 2, B2B at step 3) */}
                {(signupStep === 2 && !isB2B) || (signupStep === 3 && isB2B) ? (
                  <form className="w-full self-center grid gap-[1.1rem]" onSubmit={handleVerifyEmail}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify your email</h3>
                      <p className="text-sm text-gray-600">
                        We sent a 6-digit code to{' '}
                        <span className="font-semibold text-gray-900">{verificationEmail}</span>
                      </p>
                    </div>

                    <label className="grid gap-2 text-sm text-slate-600">
                      <span>Verification Code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                        required
                        className="rounded-xl border border-slate-400/45 bg-white/95 px-3.5 py-3 text-center text-lg tracking-[0.5rem] transition-all duration-250 ease-in-out focus:outline-none focus:border-red-700/60 focus:ring-4 focus:ring-red-700/12 w-full"
                      />
                    </label>

                    {signupError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {signupError}
                      </div>
                    )}

                    <div className="flex justify-between gap-4 items-center">
                      <button
                        type="button"
                        onClick={() => setSignupStep(isB2B ? 2 : 1)}
                        className="border-none bg-slate-900/8 text-slate-600 px-5 py-3 rounded-full font-semibold cursor-pointer transition-all duration-200 ease-in-out hover:bg-slate-900/12 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={verificationLoading}
                        className="w-full py-3.5 rounded-full border-none font-semibold text-white cursor-pointer transition-all duration-200 ease-out disabled:opacity-65 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                          boxShadow: '0 20px 30px rgba(160, 11, 11, 0.25)',
                          transform: 'translateY(0)',
                        }}
                        onMouseEnter={(e) => {
                          if (!verificationLoading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!verificationLoading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 20px 30px rgba(160, 11, 11, 0.25)';
                          }
                        }}
                        onMouseDown={(e) => {
                          if (!verificationLoading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 18px 28px rgba(160, 11, 11, 0.22)';
                          }
                        }}
                        onMouseUp={(e) => {
                          if (!verificationLoading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 24px 38px rgba(160, 11, 11, 0.3)';
                          }
                        }}
                      >
                        {verificationLoading ? (
                          <span className="inline-flex items-center justify-center">
                            Verifying
                            <LoadingDots />
                          </span>
                        ) : (
                          'Verify and Continue'
                        )}
                      </button>
                    </div>

                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendLoading || resendCooldown > 0}
                        className="text-sm text-orange-600 hover:text-red-700 font-medium cursor-pointer bg-transparent border-none disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : resendLoading
                          ? 'Resending…'
                          : 'Resend code'}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Step: Success (C2B at step 3, B2B at step 4) */}
                {(signupStep === 3 && !isB2B) || (signupStep === 4 && isB2B) ? (
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
                        navigate('/account', { replace: true });
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
                      Go to My Account
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="text-center flex flex-col items-center justify-center gap-2 text-sm text-gray-600 m-8">
                <span>
                  Already have an account?{' '}
                  <button type="button" className="text-orange-600 hover:text-red-700 font-medium cursor-pointer" onClick={showLogin}>
                    Sign in
                  </button>
                </span>
                <span className="text-xs text-slate-400">© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved <br></br> Powered by <a href="https://www.bpd.ma" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-red-700 font-medium">BP. Digital</a></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
