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
  <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
    <aside className="lg:sticky lg:top-28 lg:h-fit">
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">{sidebar}</div>
    </aside>
    <section className="space-y-8">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  </div>
);
