import { useEffect, useState } from 'react';
import { AuthPromptModal } from '../common/AuthPromptModal';
import { Footer } from './Footer';
import { Header } from './Header';

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerHeight, setHeaderHeight] = useState(120); // Default height with promo banner
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptContent, setAuthPromptContent] = useState<{ title?: string; message?: string } | null>(null);

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

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setAuthPromptContent({
        title: typeof detail?.title === 'string' ? detail.title : undefined,
        message: typeof detail?.message === 'string' ? detail.message : undefined,
      });
      setAuthPromptOpen(true);
    };

    window.addEventListener('openAuthPrompt', handleOpen as EventListener);
    return () => {
      window.removeEventListener('openAuthPrompt', handleOpen as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 transition-all duration-300" style={{ paddingTop: `${headerHeight}px` }}>
        {children}
      </main>
      <Footer />
      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => {
          setAuthPromptOpen(false);
          setAuthPromptContent(null);
        }}
        title={authPromptContent?.title}
        message={authPromptContent?.message}
      />
    </div>
  );
};
