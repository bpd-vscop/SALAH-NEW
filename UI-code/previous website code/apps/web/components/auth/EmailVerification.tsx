
// filepath: apps/web/components/auth/EmailVerification.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@automotive/ui/components/ui/button';
import { Alert, AlertDescription } from '@automotive/ui/components/ui/alert';
import { api } from '../../lib/api';
import Link from 'next/link';

export function EmailVerification() {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const verifyEmailMutation = api.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setVerificationStatus('success');
      setMessage('Your email has been verified successfully!');
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login?verified=true');
      }, 3000);
    },
    onError: (error) => {
      setVerificationStatus('error');
      setMessage(error.message);
    },
  });

  const resendVerificationMutation = api.auth.resendEmailVerification.useMutation({
    onSuccess: () => {
      setMessage('Verification email sent successfully!');
    },
    onError: (error) => {
      setMessage(error.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyEmailMutation.mutate({ token });
    } else {
      setVerificationStatus('error');
      setMessage('Invalid verification link');
    }
  }, [token]);

  const handleResendVerification = () => {
    const email = searchParams.get('email');
    if (email) {
      resendVerificationMutation.mutate({ 
        email, 
        userType: 'client' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-500 mb-4">ULKS</div>
          
          {verificationStatus === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Verifying your email...
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your email address.
              </p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Email Verified!
              </h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting you to login in a few seconds...
              </p>
              <Link href="/login">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  Go to Login
                </Button>
              </Link>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Verification Failed
              </h2>
              
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-gray-600">
                  The verification link may have expired or is invalid.
                </p>
                
                {searchParams.get('email') && (
                  <Button
                    onClick={handleResendVerification}
                    disabled={resendVerificationMutation.isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {resendVerificationMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                )}

                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


