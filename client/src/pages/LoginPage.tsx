import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';

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

  const isB2B = signupData.accountType === 'B2B';
  const stepCount = isB2B ? 3 : 2;

  return (
    <div className="auth-shell">
      <div className="login-card">
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'translate(-50%, -50%)',
          width: '15rem',
          height: '10rem',
          borderRadius: '9999px',
          background: '#eab308',
          opacity: 0.15,
          filter: 'blur(100px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          transform: 'translate(50%, 50%)',
          width: '15rem',
          height: '10rem',
          borderRadius: '9999px',
          background: '#b91c1c',
          opacity: 0.15,
          filter: 'blur(100px)',
        }} />
        <div className="login-card-inner">
          <div className="login-logo-stack">
            <img
              src="https://i.postimg.cc/nVjjhfsz/qt-q-95.png"
              alt="ULKS Logo"
              className="login-logo-img"
            />
          </div>

          <div className="login-switch" role="tablist" aria-label="Authentication">
            <div className={`login-switch-slider ${activeTab === 'signup' ? 'is-right' : ''}`}></div>
            <button
              type="button"
              className={activeTab === 'login' ? 'login-switch-btn is-active' : 'login-switch-btn'}
              onClick={showLogin}
              role="tab"
              aria-selected={activeTab === 'login'}
            >
              Login
            </button>
            <button
              type="button"
              className={activeTab === 'signup' ? 'login-switch-btn is-active' : 'login-switch-btn'}
              onClick={showSignup}
              role="tab"
              aria-selected={activeTab === 'signup'}
            >
              Sign Up
            </button>
          </div>

          <div style={{ position: 'relative', minHeight: '460px' }}>
            {/* Login panel */}
            <div
              className={`login-panel transition-transform duration-500 ease-in-out ${
                activeTab === 'login'
                  ? 'opacity-100 translate-x-0 relative'
                  : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'
              }`}
              role="tabpanel"
            >
              <h1 className="login-heading">Welcome to ULKS</h1>

              <form className="login-form" onSubmit={handleLogin}>
                <label className="login-field">
                  <span>Email Address</span>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(event) => setLoginUsername(event.target.value.toLowerCase())}
                    placeholder="you@example.com"
                    autoComplete="username"
                    required
                  />
                </label>
                <label className="login-field">
                  <span>Password</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="password-toggle"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <div className="login-utility">
                  <label className="login-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    Remember me
                  </label>
                  <span className="login-forgot">Forgot password?</span>
                </div>
                {loginError && (
                  <div className="login-error" role="alert">
                    {loginError}
                  </div>
                )}
                <button type="submit" className="login-submit" disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <div className="login-footer">
                <span>
                  Don&apos;t have an account?{' '}
                  <button type="button" className="login-footer-link" onClick={showSignup}>
                    Create one
                  </button>
                </span>
                <span className="login-legal">© {new Date().getFullYear()} ULK Supply LLC. All rights reserved.</span>
              </div>
            </div>

            {/* Signup panel */}
            <div
              className={`signup-panel transition-transform duration-500 ease-in-out ${
                activeTab === 'signup'
                  ? 'opacity-100 translate-x-0 relative'
                  : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'
              }`}
              role="tabpanel"
            >
              <h1 className="login-heading">Create your ULKS Account</h1>

              {/* Step indicators */}
              <div className="signup-steps" aria-hidden="true">
                {Array.from({ length: stepCount + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`step-dot ${signupStep === i ? 'is-current' : ''}`}
                  >
                    {signupStep === i && (i + 1)}
                  </div>
                ))}
              </div>

              {signupError && (
                <div className="login-error" role="alert">
                  {signupError}
                </div>
              )}

              <div className="signup-stage">
                {signupStep === 0 && (
                  <form className="signup-form" onSubmit={handleSignupStep0}>
                    <div className="signup-account-type" role="tablist" aria-label="Account type">
                      {(['B2B', 'C2B'] as const).map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={signupData.accountType === type ? 'signup-type is-selected' : 'signup-type'}
                          onClick={() => setSignupData((prev) => ({ ...prev, accountType: type }))}
                        >
                          {type === 'B2B' ? 'Business (B2B)' : 'Individual (C2B)'}
                        </button>
                      ))}
                    </div>

                    <label className="login-field">
                      <span>Full Name</span>
                      <input
                        type="text"
                        value={signupData.fullName}
                        onChange={(event) => setSignupData((prev) => ({ ...prev, fullName: event.target.value }))}
                        placeholder="Your full name"
                        required
                      />
                    </label>

                    {signupData.accountType === 'B2B' && (
                      <label className="login-field">
                        <span>Company Name</span>
                        <input
                          type="text"
                          value={signupData.companyName}
                          onChange={(event) => setSignupData((prev) => ({ ...prev, companyName: event.target.value }))}
                          placeholder="Your business"
                          required
                        />
                      </label>
                    )}

                    <label className="login-field">
                      <span>Phone Number (optional)</span>
                      <PhoneNumberInput
                        value={phoneValue}
                        onChange={(val) => {
                          setPhoneValue(val);
                          setSignupData((prev) => ({ ...prev, phone: `${val.countryCode}${val.number}` }));
                        }}
                        placeholder="1234567890"
                      />
                    </label>

                    <button type="submit" className="login-submit">
                      Continue
                    </button>
                  </form>
                )}

                {signupStep === 1 && (
                  <form className="signup-form" onSubmit={handleSignupCredentials}>
                    <label className="login-field">
                      <span>Email Address</span>
                      <input
                        type="email"
                        value={signupData.username}
                        onChange={(event) => setSignupData((prev) => ({ ...prev, username: event.target.value }))}
                        placeholder="you@example.com"
                        required
                      />
                    </label>
                    <label className="login-field">
                      <span>Password</span>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          value={signupData.password}
                          onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
                          placeholder="Create a password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="password-toggle"
                          aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignupPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>
                    </label>
                    <label className="login-field">
                      <span>Confirm Password</span>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={signupData.confirmPassword}
                          onChange={(event) => setSignupData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                          placeholder="Confirm your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="password-toggle"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>
                    </label>
                    <div className="signup-actions">
                      <button type="button" className="signup-back" onClick={() => setSignupStep(0)}>
                        Back
                      </button>
                      <button type="submit" className="login-submit" disabled={signupLoading}>
                        {signupLoading ? 'Creating…' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                )}

                {signupStep === 2 && (
                  <div className="signup-success">
                    <div className="signup-success-badge">✔</div>
                    <h2>Account created!</h2>
                    <p>You can now sign in using your new credentials.</p>
                    <button type="button" className="login-submit" onClick={() => { showLogin(); resetSignup(); }}>
                      Go to Login
                    </button>
                  </div>
                )}
              </div>

              <div className="login-footer">
                <span>
                  Already have an account?{' '}
                  <button type="button" className="login-footer-link" onClick={showLogin}>
                    Sign in
                  </button>
                </span>
                <span className="login-legal">© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
