import { Footer } from './Footer';
import { Header } from './Header';

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="site-shell">
    <Header />
    <main className="site-content">{children}</main>
    <Footer />
  </div>
);
