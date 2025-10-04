// filepath: apps/admin/components/auth/PermissionGate.tsx
// Component to conditionally render children based on user permissions

"use client";

import { useAdminAuth } from "../../hooks/useAdminAuth";

interface PermissionGateProps {
  children: React.ReactNode;
  resource: string;
  action: string;
}

export function PermissionGate({
  children,
  resource,
  action,
}: PermissionGateProps) {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(resource, action)) {
    return null;
  }

  return <>{children}</>;
}
