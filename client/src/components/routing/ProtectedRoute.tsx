import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/api';

interface ProtectedRouteProps {
  allowRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowRoles,
  redirectTo = '/login',
}) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (
    user.role === 'client' &&
    user.isEmailVerified === false &&
    location.pathname !== '/verify'
  ) {
    return <Navigate to="/verify" replace state={{ email: user.email || user.username }} />;
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
