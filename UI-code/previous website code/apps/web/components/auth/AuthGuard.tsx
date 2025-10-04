// filepath: apps/web/components/auth/AuthGuard.tsx
"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isLoggedIn) {
        // Store the intended destination
        const returnUrl = pathname !== '/login' && pathname !== '/register' 
          ? `?returnUrl=${encodeURIComponent(pathname)}`
          : '';
        
        router.push(`${redirectTo}${returnUrl}`);
      } else if (!requireAuth && isLoggedIn) {
        // If user is logged in but accessing login/register pages
        if (pathname === '/login' || pathname === '/register') {
          router.push('/profile');
        }
      }
    }
  }, [isLoggedIn, isLoading, requireAuth, router, pathname, redirectTo]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && !isLoggedIn) {
    return null;
  }

  if (!requireAuth && isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return null;
  }

  return <>{children}</>;
}
