import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_VISITED_STORAGE_KEY = 'lastVisitedPath';
const EXCLUDED_PATH_PREFIXES = ['/login', '/register', '/reset-password', '/clients/register'];

const shouldTrackPath = (pathname: string) =>
  !EXCLUDED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!shouldTrackPath(pathname)) {
      return;
    }
    const nextPath = `${pathname}${search}${hash}`;
    try {
      window.localStorage.setItem(LAST_VISITED_STORAGE_KEY, nextPath);
    } catch {
      return;
    }
  }, [pathname, search, hash]);

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
