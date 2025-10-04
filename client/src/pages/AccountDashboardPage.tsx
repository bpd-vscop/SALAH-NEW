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
        <div className="dashboard-placeholder">Sign in to view your dashboard.</div>
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
    <nav className="dashboard-nav">
      <a href="#account">Account</a>
      <a href="#orders">Orders</a>
      <a href="#verification">Verification</a>
    </nav>
  );

  return (
    <SiteLayout>
      <DashboardLayout
        title="Client Dashboard"
        subtitle="Track your orders and manage your profile"
        sidebar={sidebar}
      >
        <section id="account" className="dashboard-section">
          <h2>Account information</h2>
          <dl className="info-grid">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill
                  label={user.status === 'active' ? 'Active' : 'Inactive'}
                  tone={user.status === 'active' ? 'positive' : 'critical'}
                />
              </dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatTimestamp(user.accountCreated)}</dd>
            </div>
          </dl>
        </section>

        <section id="verification" className="dashboard-section">
          <h2>Verification</h2>
          {user.verificationFileUrl ? (
            <p>
              Verification file on record.{' '}
              <a href={user.verificationFileUrl} target="_blank" rel="noreferrer">
                View file
              </a>
            </p>
          ) : (
            <p className="warning">Upload your verification file before checking out.</p>
          )}
          <form className="verification-form" onSubmit={handleUpload}>
            <label className="file-input">
              <span>Replace verification file</span>
              <input type="file" name="verification" accept="application/pdf,image/*" />
            </label>
            <button type="submit" className="primary-button" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
          {uploadMessage && <p className="muted">{uploadMessage}</p>}
        </section>

        <section id="orders" className="dashboard-section">
          <h2>Order history</h2>
          {loading && <p>Loading orders…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !orders.length && <p>No orders yet. Visit the catalog to start shopping.</p>}
          {!!orders.length && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const total = order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  return (
                    <tr key={order.id}>
                      <td>{order.id.slice(-6)}</td>
                      <td>
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
                      <td>{formatTimestamp(order.createdAt)}</td>
                      <td>{order.products.length}</td>
                      <td>{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </DashboardLayout>
    </SiteLayout>
  );
};

