// filepath: apps/admin/app/login/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@automotive/ui/components/ui/button';
import { Input } from '@automotive/ui/components/ui/input';
import { Label } from '@automotive/ui/components/ui/label';
import { Checkbox } from '@automotive/ui/components/ui/checkbox';
import { Alert, AlertDescription } from '@automotive/ui/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@automotive/ui/components/ui/card';
import { PhoneNumberInput } from '@automotive/ui/components/ui/phone-input';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { api } from '../../lib/api';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginType, setLoginType] = useState<'client' | 'staff'>('client');
  const [signupStep, setSignupStep] = useState<0 | 1 | 2 | 3>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, loginWithGoogle, isAuthenticated, user } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Web app base URL for client dashboard redirect
  const webBaseUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_WEB_URL) return process.env.NEXT_PUBLIC_WEB_URL;
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:3000`;
    }
    return '';
  }, []);

  // Web URL for Google auth redirects
  const webUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_WEB_URL) return process.env.NEXT_PUBLIC_WEB_URL;
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:3000`;
    }
    return '';
  }, []);

  // API mutation hooks hitting Fastify REST endpoints
  const clientLoginMutation = api.auth.clientLogin.useMutation({
    retry: false,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  // Initialize tab from URL query (?tab=signup)
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'signup') setActiveTab('signup');
  }, [searchParams]);

  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    const params = new URLSearchParams(Array.from(searchParams?.entries?.() || []));
    params.set('tab', tab);
    router.replace(`?${params.toString()}`);
    setError(null);
    if (tab === 'signup') setSignupStep(0);
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch } =
    useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: '',
        password: '',
        rememberMe: false,
      },
    });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try staff first (reduces noisy 401s for admin logins), then fallback to client
      const staffResult = await login(data.email, data.password, data.rememberMe);
      if (staffResult.success) {
        router.push('/');
        return;
      }

      try {
        const result = await clientLoginMutation.mutateAsync({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        });
        if (result?.success) {
          window.location.href = `${webBaseUrl}/dashboard`;
          return;
        }
      } catch {}

      setError('Login failed. Please check your credentials.');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        if (user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('manager')) {
          router.push('/');
        } else {
          setError('Client accounts should use the main website login.');
        }
      } else {
        setError(result.error || 'Google login failed. Please try again.');
      }
    } catch {
      setError('Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle demo login for testing
  const handleDemoLogin = async (role: 'super-admin' | 'admin' | 'manager') => {
    // Matches users created by npm run --workspace=@automotive/database db:seed
    const demoCredentials = {
      'super-admin': { email: 'superadmin@ulks.com', password: 'admin123!@#' },
      'admin': { email: 'admin@ulks.com', password: 'admin123!@#' },
      'manager': { email: 'manager@ulks.com', password: 'admin123!@#' },
    } as const;

    const creds = demoCredentials[role];
    setValue('email', creds.email);
    setValue('password', creds.password);
    
    await onSubmit({ ...creds, rememberMe: false });
  };

  return (
    <div className="relative min-h-screen flex justify-center pt-16 pb-8 px-4 overflow-hidden">
      {/* Soft radial gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100"></div>

      {/* Card */}
      <div className="relative w-full max-w-md z-10 self-start">
        <Card className="relative bg-white/60 backdrop-blur-md border border-white shadow-2xl overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[15rem] h-[10rem] rounded-full bg-yellow-500 opacity-15 blur-[100px]"></div>
          <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-[15rem] h-[10rem] rounded-full bg-red-700 opacity-15 blur-[100px]"></div>
          <CardHeader className="space-y-4 text-center pb-4">
            <Image
              src="https://i.postimg.cc/nVjjhfsz/qt-q-95.png"
              alt="ULKS Logo"
              width={120}
              height={50}
              className="mx-auto h-16 w-auto"
              priority
            />
            {/* Tabs */}
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-white/70 border border-gray-200 w-full max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`text-sm font-medium py-2 rounded-full transition-colors ${activeTab === 'login' ? 'bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  aria-selected={activeTab === 'login'}
                  role="tab"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className={`text-sm font-medium py-2 rounded-full transition-colors ${activeTab === 'signup' ? 'bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  aria-selected={activeTab === 'signup'}
                  role="tab"
                >
                  Sign Up
                </button>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {activeTab === 'login' ? 'Welcome to ULKS' : 'Create your ULKS Account'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {activeTab === 'login' ? 'Sign in to continue to your account' : 'Join ULKS for professional locksmith supplies'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="relative min-h-[460px]">
              {/* Login panel */}
              <div className={`transition-transform duration-500 ease-in-out ${activeTab === 'login' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'}`}>
                <div className="space-y-6">
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Continue with Google (client) */}
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      onClick={() => window.open(`${webUrl}/(auth)/login?provider=google`, '_blank')}
                      className="relative w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 py-3 font-medium z-10 rounded-full"
                    >
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </div>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center">
                    <span className="flex-1 border-t border-gray-300"></span>
                    <span className="px-2 text-xs text-gray-500">OR</span>
                    <span className="flex-1 border-t border-gray-300"></span>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div>
                      <Label htmlFor="login-email">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="login-email"
                          type="text"
                          placeholder={'you@example.com'}
                          disabled={isLoading}
                          {...register('email')}
                          className={`bg-white text-gray-900 transition-colors ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        />
                      </div>
                      {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          {...register('password')}
                          className={`bg-white text-gray-900 pr-10 transition-colors ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </Button>
                      </div>
                      {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="rememberMe" className="text-sm">Remember me</Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white font-medium py-3 shadow-lg rounded-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Signup panel */}
              <div className={`transition-transform duration-500 ease-in-out ${activeTab === 'signup' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'}`}>
                <SignupSteps step={signupStep} onStepChange={setSignupStep} onDone={() => switchTab('login')} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-white/10 text-center text-sm text-gray-600 flex flex-col justify-center items-center space-y-2">
            {activeTab === 'login' ? (
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="text-[#f67f10] hover:text-[#a00b0b] font-medium"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-[#f67f10] hover:text-[#a00b0b] font-medium "
                >
                  Sign in
                </button>
              </p>
            )}
            <p>© {new Date().getFullYear()} ULK Supply LLC. All Rights Reserved.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Signup steps component rendered inside the card to keep styling consistent
function SignupSteps({
  step,
  onStepChange,
  onDone,
}: {
  step: 0 | 1 | 2 | 3;
  onStepChange: (s: 0 | 1 | 2 | 3) => void;
  onDone: () => void;
}) {
  const registerSchema = z
    .object({
      firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name too long'),
      lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(50, 'Last name too long'),
      accountType: z.enum(['B2B', 'C2B']),
      email: z.string().email('Please enter a valid email address'),
      phone: z
        .string()
        .min(7, 'Phone number is required')
        .max(15, 'Phone number is too long')
        .regex(/^\+?\d+$/, 'Phone number must contain only numbers'),
      companyName: z.string().optional(),
      companyWebsite: z
        .string()
        .optional()
        .transform((v) => (v ?? '').trim())
        .refine((v) => v === '' || v.includes('.'), {
          message: 'Enter a valid domain or URL',
        })
        .transform((v) => {
          if (!v) return undefined;
          return /^https?:\/\//i.test(v) ? v : `https://${v}`;
        }),
      taxId: z.string().optional(),
      businessType: z.string().optional(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/\d/, 'Must contain at least one number')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.accountType === 'B2B') {
        if (!data.companyName || !data.companyName.trim()) {
          ctx.addIssue({ code: 'custom', message: 'Company name is required', path: ['companyName'] });
        }
        if (!data.businessType || !data.businessType.trim()) {
          ctx.addIssue({ code: 'custom', message: 'Business type is required', path: ['businessType'] });
        }
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: 'custom', message: "Passwords don't match", path: ['confirmPassword'] });
      }
    });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    getValues,
    watch: watchReg,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      accountType: 'B2B',
      email: '',
      phone: '',
      companyName: '',
      companyWebsite: '',
      taxId: '',
      businessType: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isB2B = watchReg('accountType') === 'B2B';

  const nextFromStep0 = async () => {
    setServerError(null);
    const ok = await trigger(['firstName', 'lastName', 'phone', 'accountType']);
    if (ok) onStepChange(1);
  };

  const backFromStep1 = () => onStepChange(0);
  const nextFromStep1B2B = async () => {
    setServerError(null);
    const ok = await trigger(['companyName', 'businessType']);
    if (ok) onStepChange(2);
  };
  const backFromStep2B2B = () => onStepChange(1);

  const clientRegister = api.auth.clientRegister.useMutation();

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const res: any = await clientRegister.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });
      if (res?.success) {
        setSuccess(true);
        onStepChange(isB2B ? 3 : 2);
      } else {
        setServerError('Registration failed. Please try again.');
      }
    } catch (e: any) {
      setServerError(e?.message || 'Registration failed.');
    }
  };

  const webUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_WEB_URL || `${window.location.protocol}//${window.location.hostname}:3000`) : process.env.NEXT_PUBLIC_WEB_URL || '';
  const [phoneVal, setPhoneVal] = useState<{ countryCode: string; number: string }>({ countryCode: '+1', number: '' });

  return (
    <div className="space-y-4">
      {/* Google Registration */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={() => window.open(`${webUrl}/(auth)/login?provider=google`, '_blank')}
          className="relative w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 py-3 font-medium z-10 rounded-full"
        >
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </div>
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center">
        <span className="flex-1 border-t border-gray-300"></span>
        <span className="px-2 text-xs text-gray-500">OR</span>
        <span className="flex-1 border-t border-gray-300"></span>
      </div>
      {/* Step indicators */}
      <div className="flex items-center justify-center space-x-4">
        {Array.from({ length: isB2B ? 4 : 3 }).map((_, i) => (
          <div
            key={i}
            className={`transition-all duration-500 ease-in-out transform ${
              step === i 
                ? 'h-8 w-8 -translate-y-1 bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white flex items-center justify-center text-sm font-medium rounded-full shadow-lg' 
                : 'h-2 w-2 bg-gray-300 rounded-full'
            }`}
          >
            {step === i && (i + 1)}
          </div>
        ))}
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Steps container with simple fade/slide transitions */}
      <div className="relative overflow-hidden">
        {/* Step 0: Personal Info (same for B2B and C2B) */}
        <div className={`transition-transform duration-500 ease-in-out ${step === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'}`}>
          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-2 mb-4 transition-all duration-500 ease-in-out">
            {(['B2B','C2B'] as const).map(type => (
              <button
                key={type}
                type="button"
                className={`text-sm font-medium py-2 rounded-full transition-all duration-500 ease-in-out ${watchReg('accountType') === type ? 'bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white shadow' : 'bg-white text-gray-700 border'}`}
                onClick={() => {
                  // set account type explicitly and trigger validation
                  setValue('accountType', type, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <input type="hidden" {...register('accountType')} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="First name" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Last name" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="phone">Phone (numbers only)</Label>
            <PhoneNumberInput
              value={phoneVal}
              onChange={(v) => {
                setPhoneVal(v);
                const combined = `${v.countryCode}${v.number}`;
                setValue('phone', combined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Company info moved to next step for B2B */}
          <div className="flex justify-end mt-6">
            <Button onClick={nextFromStep0} className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white">Next</Button>
          </div>
        </div>

        {/* Step 1: B2B Company Info OR C2B Account Security */}
        <div className={`transition-transform duration-500 ease-in-out ${step === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'}`}>
          {isB2B ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Your company name" {...register('companyName')} />
                {errors.companyName && (
                  <p className="text-sm text-red-600">{errors.companyName.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input id="businessType" placeholder="e.g. LLC, Sole Proprietor" {...register('businessType')} />
                  {errors.businessType && (
                    <p className="text-sm text-red-600">{errors.businessType.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID (optional)</Label>
                  <Input id="taxId" placeholder="Tax ID" {...register('taxId')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website (optional)</Label>
                <Input id="companyWebsite" placeholder="https://example.com" {...register('companyWebsite')} />
                {errors.companyWebsite && (
                  <p className="text-sm text-red-600">{errors.companyWebsite.message}</p>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={backFromStep1}>Back</Button>
                <Button type="button" className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white" onClick={nextFromStep1B2B}>
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Create a password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={backFromStep1}>Back</Button>
                <Button type="submit" className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Step 2: B2B Account Security OR C2B Success */}
        <div className={`transition-transform duration-500 ease-in-out ${step === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'}`}>
          {isB2B ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Create a password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={backFromStep2B2B}>Back</Button>
                <Button type="submit" className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-yellow-500">ULKS</div>
              <h2 className="text-xl font-semibold text-gray-900">Account Created!</h2>
              <p className="text-gray-600">Please check your email to verify your account before logging in.</p>
              <div className="pt-2">
                <Button onClick={onDone} className="w-full bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white">Go to Login</Button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: B2B Success */}
        <div className={`transition-transform duration-500 ease-in-out ${step === 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'}`}>
          <div className="text-center space-y-4">
            <div className="text-3xl font-bold text-yellow-500">ULKS</div>
            <h2 className="text-xl font-semibold text-gray-900">Account Created!</h2>
            <p className="text-gray-600">Please check your email to verify your account before logging in.</p>
            <div className="pt-2">
              <Button onClick={onDone} className="w-full bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white">Go to Login</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





