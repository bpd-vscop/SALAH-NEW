// filepath: apps/web/app/(auth)/register/page.tsx
import { Metadata } from 'next';
import { RegisterForm } from '../../../components/auth/RegisterForm';
import { AuthGuard } from '../../../components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'Create Account | ULKS Automotive Locksmith',
  description: 'Create your ULKS account to access professional locksmith supplies and exclusive B2B pricing.',
};

export default function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <RegisterForm />
        </div>
      </div>
    </AuthGuard>
  );
}
