import { Footer } from './Footer';
import { Header } from './Header';

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background text-slate-950 flex flex-col">
    <Header />
    <main className="flex-1 w-full max-w-content px-4 sm:px-6 lg:px-8 pt-8 pb-16 mx-auto">{children}</main>
    <Footer />
  </div>
);
