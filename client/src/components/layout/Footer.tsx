export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-surface">
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 text-sm text-slate-600 md:grid-cols-3">
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-slate-900">About</h4>
          <p>
            A single-stop marketplace for locksmiths, fleet operators, and local businesses.
            Trusted since 2010.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-slate-900">Visit Us</h4>
          <p>123 Industrial Ave, Springfield, USA</p>
          <p>Mon - Fri, 9am - 6pm</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-slate-900">Support</h4>
          <p>support@salahstore.test</p>
          <p>(555) 123-4567</p>
        </div>
      </div>
    </div>
    <div className="border-t border-border bg-background py-4 text-center text-xs text-muted">
      © {new Date().getFullYear()} SALAH Store · All sales are final
    </div>
  </footer>
);
