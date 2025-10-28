import { useEffect, useState } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerHeight, setHeaderHeight] = useState(120); // Default height with promo banner

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.getElementById('main-header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    // Initial measurement
    updateHeaderHeight();

    // Create a ResizeObserver to watch for header size changes
    const header = document.getElementById('main-header');
    if (header) {
      const observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(header);

      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 transition-all duration-300" style={{ paddingTop: `${headerHeight}px` }}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
