import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { uploadsApi } from '../api/uploads';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';

export const CheckoutPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const { items, loadFromServer, clearCart } = useCart();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [uploading, setUploading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const missing = items.filter((line) => !productMap[line.productId]).map((line) => line.productId);
    if (!missing.length) {
      return;
    }
    const load = async () => {
      const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
      const next: Record<string, Product> = {};
      responses.forEach((result) => {
        if (result.status === 'fulfilled') {
          next[result.value.product.id] = result.value.product;
        }
      });
      setProductMap((current) => ({ ...current, ...next }));
    };
    void load();
  }, [items, productMap]);

  const total = useMemo(() => {
    return items.reduce((sum, line) => {
      const price = productMap[line.productId]?.price ?? 0;
      return sum + price * line.quantity;
    }, 0);
  }, [items, productMap]);

  if (!user) {
    return (
      <SiteLayout>
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
          Authentication required.
        </div>
      </SiteLayout>
    );
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('verification') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError('Please choose a PDF or image file.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      await uploadsApi.uploadVerification(file);
      setStatusMessage('Verification uploaded successfully.');
      await refresh();
      await loadFromServer();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (input) {
        input.value = '';
      }
    }
  };

  const placeOrder = async () => {
    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }
    if (!user.verificationFileUrl) {
      setError('Upload verification before placing an order.');
      return;
    }

    setPlacingOrder(true);
    setError(null);
    try {
      await ordersApi.create({
        products: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      await clearCart();
      setStatusMessage('Order submitted. Track it from your dashboard.');
      navigate('/account');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <SiteLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">Checkout</h1>
          <p className="text-sm text-muted">Verify account, confirm items, and submit your purchase order.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Verification</h2>
            {user.verificationFileUrl ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Verification file on record.{' '}
                <a className="font-semibold text-primary hover:text-primary-dark" href={user.verificationFileUrl} target="_blank" rel="noreferrer">
                  View file
                </a>
              </p>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Upload a PDF or image to verify your eligibility.
              </p>
            )}
            <form
              className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-background p-4"
              onSubmit={handleUpload}
            >
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Upload verification file (PDF, PNG, JPG)</span>
                <input
                  type="file"
                  name="verification"
                  accept="application/pdf,image/*"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-none file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>
              <button
                type="submit"
                className="inline-flex w-fit items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
            <ul className="space-y-3 text-sm text-slate-700">
              {items.map((line) => {
                const product = productMap[line.productId];
                const unitPrice = product?.price ?? 0;
                return (
                  <li key={line.productId} className="flex items-center justify-between gap-4">
                    <span>{product?.name ?? 'Item'}</span>
                    <span className="font-medium text-slate-900">
                      {line.quantity} x {formatCurrency(unitPrice)} = {formatCurrency(unitPrice * line.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <span className="text-sm text-muted">Total</span>
              <strong className="text-lg text-slate-900">{formatCurrency(total)}</strong>
            </div>
            <p className="text-xs text-muted">All sales are final. No returns are accepted.</p>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={placingOrder}
              onClick={placeOrder}
            >
              {placingOrder ? 'Placing order...' : 'Place order'}
            </button>
          </div>
        </div>
        {statusMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </section>
    </SiteLayout>
  );
};
