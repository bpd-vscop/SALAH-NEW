interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  headerActions,
  sidebar,
  children,
}) => (
  <div className="dashboard-shell">
    <aside className="dashboard-sidebar">{sidebar}</aside>
    <section className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
        </div>
        {headerActions && <div className="dashboard-actions">{headerActions}</div>}
      </header>
      <div className="dashboard-content">{children}</div>
    </section>
  </div>
);
