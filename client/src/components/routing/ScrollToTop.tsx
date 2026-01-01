import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = 'auto';
      };
    }
    return;
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBehavior = html.style.scrollBehavior;
    const prevBodyBehavior = body.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prevHtmlBehavior;
    body.style.scrollBehavior = prevBodyBehavior;
  }, [pathname]);

  return null;
};
