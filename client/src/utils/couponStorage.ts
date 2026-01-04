const STORAGE_KEY = 'salah-store-coupon';

type StoredCoupon = {
  code: string;
};

const parseStoredCoupon = (raw: string | null): StoredCoupon | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.code === 'string') {
      return { code: parsed.code };
    }
    return null;
  } catch {
    return null;
  }
};

export const readStoredCouponCode = (): string => {
  const stored = parseStoredCoupon(localStorage.getItem(STORAGE_KEY));
  return stored?.code ?? '';
};

export const writeStoredCouponCode = (code: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code }));
  } catch {
    return;
  }
};

export const clearStoredCouponCode = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
};
