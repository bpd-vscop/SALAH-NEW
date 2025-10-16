type VersionInfo = {
  version?: string;
  buildId?: string;
  builtAt?: string;
};

const STORAGE_KEY = 'app:lastBuildId';
const VERSION_URL = '/version.json';

async function fetchVersionInfo(): Promise<VersionInfo | null> {
  try {
    const res = await fetch(`${VERSION_URL}?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionInfo;
    return data;
  } catch {
    return null;
  }
}

async function clearAppCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}
}

async function checkAndUpdate() {
  const remote = await fetchVersionInfo();
  if (!remote?.buildId) return;

  const lastSeen = localStorage.getItem(STORAGE_KEY);
  if (!lastSeen) {
    // First run: record current remote build id
    localStorage.setItem(STORAGE_KEY, remote.buildId);
    return;
  }

  if (remote.buildId !== lastSeen) {
    // New build detected: clear caches and force reload
    try {
      await clearAppCaches();
    } finally {
      // Update stored build id to avoid loops in edge cases
      localStorage.setItem(STORAGE_KEY, remote.buildId);
      // Add a cache-busting param to help avoid stale index.html in aggressive caches
      const url = new URL(window.location.href);
      url.searchParams.set('v', String(Date.now()));
      window.location.replace(url.toString());
    }
  }
}

export function initVersionChecker(options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 5 * 60 * 1000; // 5 minutes

  // Kick off immediately at startup
  void checkAndUpdate();

  // Poll periodically while the app is open
  const timer = window.setInterval(() => {
    void checkAndUpdate();
  }, intervalMs);

  // Check when the tab becomes visible again
  const onVis = () => {
    if (document.visibilityState === 'visible') {
      void checkAndUpdate();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  // Provide a cleanup if someone wants to stop it
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
  };
}