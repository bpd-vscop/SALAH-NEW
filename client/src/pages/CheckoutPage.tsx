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
        <div className="checkout-error">Authentication required.</div>
      </SiteLayout>
    );
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('verification') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError('Please choose a PDF or image file');
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
      <section className="checkout-page">
        <h1>Checkout</h1>
        <div className="checkout-grid">
          <div className="checkout-panel">
            <h2>Verification</h2>
            {user.verificationFileUrl ? (
              <p className="verification-status">
                Verification file on record.{' '}
                <a href={user.verificationFileUrl} target="_blank" rel="noreferrer">
                  View file
                </a>
              </p>
            ) : (
              <p className="verification-status warning">Upload a PDF or image to verify your eligibility.</p>
            )}
            <form className="verification-form" onSubmit={handleUpload}>
              <label className="file-input">
                <span>Upload verification file (PDF, PNG, JPG)</span>
                <input type="file" name="verification" accept="application/pdf,image/*" />
              </label>
              <button type="submit" className="primary-button" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </div>
          <div className="checkout-panel">
            <h2>Order Summary</h2>
            <ul className="checkout-items">
              {items.map((line) => {
                const product = productMap[line.productId];
                return (
                  <li key={line.productId}>
                    <span>{product?.name ?? 'Item'}</span>
                    <span>
                      {line.quantity} × {formatCurrency(product?.price ?? 0)} = {formatCurrency((product?.price ?? 0) * line.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <p className="checkout-policy">All sales are final. No returns are accepted.</p>
            <button type="button" className="primary-button" disabled={placingOrder} onClick={placeOrder}>
              {placingOrder ? 'Placing order…' : 'Place order'}
            </button>
          </div>
        </div>
        {statusMessage && <div className="checkout-status">{statusMessage}</div>}
        {error && <div className="checkout-error">{error}</div>}
      </section>
    </SiteLayout>
  );
};
