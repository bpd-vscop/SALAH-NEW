// filepath: apps/web/app/(auth)/verify-email/page.tsx
import { Metadata } from 'next';
import { EmailVerification } from '../../../components/auth/EmailVerification';

export const metadata: Metadata = {
  title: 'Verify Email | ULKS Automotive Locksmith',
  description: 'Verify your email address to complete your ULKS account setup.',
};

export default function VerifyEmailPage() {
  return <EmailVerification />;
}
