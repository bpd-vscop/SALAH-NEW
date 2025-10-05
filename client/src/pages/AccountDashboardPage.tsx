import { useEffect, useState } from 'react';
import { ordersApi } from '../api/orders';
import { uploadsApi } from '../api/uploads';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatTimestamp } from '../utils/format';
import type { Order } from '../types/api';
import { StatusPill } from '../components/common/StatusPill';

export const AccountDashboardPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const { orders: data } = await ordersApi.list();
        setOrders(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load orders');
      } finally {
        setLoading(false);
      }
    };
    void loadOrders();
  }, []);

  if (!user) {
    return (
      <SiteLayout>
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted">
          Sign in to view your dashboard.
        </div>
      </SiteLayout>
    );
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('verification') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setUploadMessage('Select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      await uploadsApi.uploadVerification(file);
      await refresh();
      setUploadMessage('Verification file updated successfully.');
    } catch (err) {
      console.error(err);
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (input) {
        input.value = '';
      }
    }
  };

  const sidebar = (
    <nav className="flex flex-col gap-2 text-sm">
      <a className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary" href="#account">
        Account
      </a>
      <a className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary" href="#orders">
        Orders
      </a>
      <a className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary" href="#verification">
        Verification
      </a>
    </nav>
  );

  return (
    <SiteLayout>
      <DashboardLayout
        title="Client Dashboard"
        subtitle="Track your orders and manage your profile"
        sidebar={sidebar}
      >
        <section id="account" className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Account information</h2>
            <p className="text-sm text-muted">Details of your customer profile.</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted">Name</dt>
              <dd className="text-sm font-medium text-slate-900">{user.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted">Username</dt>
              <dd className="text-sm font-medium text-slate-900">{user.username}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted">Status</dt>
              <dd>
                <StatusPill
                  label={user.status === 'active' ? 'Active' : 'Inactive'}
                  tone={user.status === 'active' ? 'positive' : 'critical'}
                />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted">Member since</dt>
              <dd className="text-sm font-medium text-slate-900">{formatTimestamp(user.accountCreated)}</dd>
            </div>
          </dl>
        </section>

        <section id="verification" className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Verification</h2>
            <p className="text-sm text-muted">
              Provide the latest documentation so we can verify trade access and limits.
            </p>
          </div>
          {user.verificationFileUrl ? (
            <p className="text-sm text-slate-700">
              Verification file on record.{' '}
              <a className="font-medium text-primary hover:text-primary-dark" href={user.verificationFileUrl} target="_blank" rel="noreferrer">
                View file
              </a>
            </p>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
              Upload your verification file before checking out.
            </p>
          )}
          <form className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-background p-4" onSubmit={handleUpload}>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Replace verification file</span>
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
          {uploadMessage && <p className="text-sm text-muted">{uploadMessage}</p>}
        </section>

        <section id="orders" className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order history</h2>
            <p className="text-sm text-muted">Your recent transactions and fulfillment status.</p>
          </div>
          {loading && <p className="text-sm text-muted">Loading orders...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !orders.length && (
            <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
              No orders yet. Visit the catalog to start shopping.
            </p>
          )}
          {!!orders.length && (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-background/80">
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {orders.map((order) => {
                    const totalValue = order.products.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    );
                    return (
                      <tr key={order.id} className="hover:bg-primary/5">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.id.slice(-6)}</td>
                        <td className="px-4 py-3">
                          <StatusPill
                            label={order.status}
                            tone={
                              order.status === 'completed'
                                ? 'positive'
                                : order.status === 'cancelled'
                                ? 'critical'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(order.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{order.products.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900">
                          {formatCurrency(totalValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </DashboardLayout>
    </SiteLayout>
  );
};
