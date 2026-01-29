export type AffirmConfig = {
  publicKey: string;
  scriptUrl: string;
  locale?: string;
  countryCode?: string;
  mode?: string;
};

type AffirmWindow = Window & {
  _affirm_config?: {
    public_api_key: string;
    script: string;
    locale?: string;
    country_code?: string;
  };
  affirm?: {
    ui?: { ready?: (cb: () => void) => void; refresh?: () => void };
    __mock?: boolean;
  };
  __affirm_last_checkout?: Record<string, unknown>;
};

export const loadAffirm = (config: AffirmConfig): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as AffirmWindow;
  w._affirm_config = {
    public_api_key: config.publicKey,
    script: config.scriptUrl,
    locale: config.locale ?? 'en_US',
    country_code: config.countryCode ?? 'USA',
  };

  return new Promise((resolve, reject) => {
    if (!config.scriptUrl) {
      resolve();
      return;
    }

    const waitForAffirm = () => {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (w.affirm?.checkout) {
          window.clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - start > 5000) {
          window.clearInterval(timer);
          reject(new Error('Affirm did not initialize in time.'));
        }
      }, 50);
    };

    if (w.affirm?.ui?.ready) {
      w.affirm.ui.ready(() => resolve());
      return;
    }

    const existing = document.querySelector('script[data-affirm-sdk]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (w.affirm?.ui?.ready) {
          w.affirm.ui.ready(() => resolve());
        } else {
          waitForAffirm();
        }
      }, { once: true });
      existing.addEventListener('error', () => {
        reject(new Error('Affirm SDK failed to load.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = config.scriptUrl;
    script.async = true;
    script.setAttribute('data-affirm-sdk', 'true');
    script.onload = () => {
      if (w.affirm?.ui?.ready) {
        w.affirm.ui.ready(() => resolve());
      } else {
        waitForAffirm();
      }
    };
    script.onerror = () => {
      reject(new Error('Affirm SDK failed to load.'));
    };
    document.head.appendChild(script);
  });
};

export const refreshAffirmUi = () => {
  if (typeof window === 'undefined') return;
  const w = window as AffirmWindow;
  if (w.affirm?.ui?.refresh) {
    w.affirm.ui.refresh();
  }
};

export const initMockAffirm = () => {
  if (typeof window === 'undefined') return;
  const w = window as AffirmWindow;
  if (w.affirm?.__mock) return;

  const checkout = ((data: Record<string, unknown>) => {
    w.__affirm_last_checkout = data;
  }) as ((data: Record<string, unknown>) => void) & {
    open: (opts: { onSuccess?: (result: { checkout_id?: string }) => void }) => void;
  };

  checkout.open = (opts) => {
    const checkoutId = `mock_checkout_${Date.now()}`;
    if (opts?.onSuccess) {
      opts.onSuccess({ checkout_id: checkoutId });
    }
  };

  w.affirm = {
    __mock: true,
    checkout,
    ui: {
      ready: (cb) => cb(),
      refresh: () => {},
    },
  };
};
