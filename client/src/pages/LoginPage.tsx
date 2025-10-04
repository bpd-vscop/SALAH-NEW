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
  accountType: 'C2B',
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

  const [signupStep, setSignupStep] = useState<SignupStep>(0);
  const [signupData, setSignupData] = useState<SignupData>(defaultSignup);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' });

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
    if (!signupData.fullName.trim()) {
      setSignupError('Please enter your full name.');
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

  return (
    <div className="auth-shell">
      <div className="login-card">
        <div className="login-card-bg" aria-hidden="true" />
        <div className="login-card-inner">
          <div className="login-logo-stack">
            <div className="login-logo-mark">ULK</div>
            <div className="login-logo-text">SUPPLY</div>
          </div>

          <div className="login-switch" role="tablist" aria-label="Authentication">
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

          {activeTab === 'login' ? (
            <div className="login-panel" role="tabpanel">
              <h1 className="login-heading">Welcome to ULKS</h1>
              <p className="login-subcopy">Sign in to continue to your account.</p>

              <button type="button" className="login-google" disabled>
                <span className="login-google-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20404C17.64 8.56619 17.5827 7.95247 17.4764 7.36389H9V10.8457H13.8436C13.635 11.9707 13.0009 12.8894 12.0482 13.5245V15.7662H14.9563C16.6582 14.2081 17.64 11.915 17.64 9.20404Z" fill="#4285F4" />
                    <path d="M9 18C11.43 18 13.4527 17.1943 14.9564 15.7662L12.0482 13.5245C11.235 14.0668 10.2073 14.4002 9 14.4002C6.65591 14.4002 4.67182 12.8252 3.96409 10.7109H0.957275V13.0314C2.45273 15.984 5.47864 18 9 18Z" fill="#34A853" />
                    <path d="M3.96409 10.7109C3.78409 10.1686 3.68182 9.59184 3.68182 9C3.68182 8.40814 3.78409 7.83136 3.96409 7.28905V4.96857H0.957273C0.347727 6.18359 0 7.55454 0 9C0 10.4455 0.347727 11.8164 0.957273 13.0314L3.96409 10.7109Z" fill="#FBBC05" />
                    <path d="M9 3.59977C10.3186 3.59977 11.4968 4.053 12.4036 4.92273L15.0205 2.30591C13.4477 0.845455 11.4259 0 9 0C5.47864 0 2.45273 2.016 0.957275 4.96859L3.96409 7.28909C4.67182 5.17477 6.65591 3.59977 9 3.59977Z" fill="#EA4335" />
                  </svg>
                </span>
                Continue with Google
              </button>

              <div className="login-divider"><span>OR</span></div>

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
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
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
          ) : (
            <div className="signup-panel" role="tabpanel">
              <h1 className="login-heading">Create your account</h1>
              <p className="login-subcopy">Register to purchase and manage orders.</p>

              <div className="signup-steps" aria-hidden="true">
                <div className={signupStep === 0 ? 'step-dot is-current' : 'step-dot'} />
                <div className={signupStep === 1 ? 'step-dot is-current' : 'step-dot'} />
                <div className={signupStep === 2 ? 'step-dot is-current' : 'step-dot'} />
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
                      <input
                        type="password"
                        value={signupData.password}
                        onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Create a password"
                        required
                      />
                    </label>
                    <label className="login-field">
                      <span>Confirm Password</span>
                      <input
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(event) => setSignupData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        placeholder="Confirm your password"
                        required
                      />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
