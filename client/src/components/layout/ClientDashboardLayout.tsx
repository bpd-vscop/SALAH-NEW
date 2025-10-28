import { type ReactNode } from 'react';
import { SiteLayout } from './SiteLayout';

interface ClientDashboardLayoutProps {
  children: ReactNode;
}

export const ClientDashboardLayout: React.FC<ClientDashboardLayoutProps> = ({ children }) => {
  return (
    <SiteLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
        {children}
      </div>
    </SiteLayout>
  );
};
