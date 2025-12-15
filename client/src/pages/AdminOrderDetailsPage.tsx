import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import type { Order, OrderStatus } from '../types/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';
import { StatusPill } from '../components/common/StatusPill';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatTimestamp } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { adminTabs, getMenuIcon } from '../utils/adminSidebar';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const resolveUploadsHref = (value?: string | null) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return `/uploads/${trimmed.replace(/^\/+/, '')}`;
};

const getOrderTone = (status: OrderStatus) => {
  if (status === 'completed') return 'positive';
  if (status === 'cancelled') return 'critical';
  if (status === 'processing') return 'warning';
  return 'warning';
};

export const AdminOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEdit = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'staff';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order]);

  const totalQty = useMemo(() => {
    if (!order) return 0;
    return order.products.reduce((sum, item) => sum + item.quantity, 0);
  }, [order]);

  useEffect(() => {
    const run = async () => {
      if (!id) {
        setOrder(null);
        setError('Order id is missing.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { order: fetched } = await ordersApi.get(id);
        setOrder(fetched);
      } catch (err) {
        console.error(err);
        setOrder(null);
        setError(err instanceof Error ? err.message : 'Failed to load order.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order || !canEdit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { order: updated } = await ordersApi.updateStatus(order.id, status);
      setOrder(updated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to update order status.');
    } finally {
      setSaving(false);
    }
  };

  const customer = order?.user ?? null;
  const profileImageUrl = resolveUploadsHref(customer?.profileImage ?? null);
  const verificationHref = resolveUploadsHref(customer?.verificationFileUrl ?? null);
  const phone = customer?.phoneNumber
    ? `${customer.phoneCode || ''}${customer.phoneCode ? ' ' : ''}${customer.phoneNumber}`
    : null;

  const topNavItems = useMemo(
    () =>
      adminTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: getMenuIcon(tab.id),
      })),
    []
  );

  return (
    <AdminLayout
      topNav={
        <AdminTopNav
          items={topNavItems}
          activeId="orders"
          onSelect={(tabId) => navigate('/admin', { state: { active: tabId } })}
        />
      }
      contentKey={id ? `order-${id}` : 'order'}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/admin', { state: { active: 'orders' } })}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Orders
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {order ? `Order #${order.id.slice(-6)}` : 'Order'}
                </h1>
                <p className="text-sm text-slate-600">
                  {order ? `Created ${formatTimestamp(order.createdAt)} • Updated ${formatTimestamp(order.updatedAt)}` : '—'}
                </p>
              </div>
            </div>

            {order && (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <StatusPill label={order.status} tone={getOrderTone(order.status)} />
                {canEdit ? (
                  <Select
                    value={order.status}
                    onChange={(value) => handleStatusChange(value as OrderStatus)}
                    options={ORDER_STATUSES.map((status) => ({ value: status, label: status }))}
                    placeholder="Select status"
                    className="min-w-[180px]"
                  />
                ) : (
                  <span className="text-xs text-muted">No access to edit status</span>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted">
            Loading order…
          </div>
        )}

        {!loading && order && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Items</h2>
                  <div className="text-sm text-slate-600">
                    {order.products.length} lines • {totalQty} qty
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full divide-y divide-border text-left text-sm">
                    <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold text-right">Qty</th>
                        <th className="px-4 py-3 font-semibold text-right">Price</th>
                        <th className="px-4 py-3 font-semibold text-right">Line total</th>
                        <th className="px-4 py-3 font-semibold">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {order.products.map((item) => (
                        <tr key={`${order.id}-${item.productId}`} className="hover:bg-primary/5">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="font-mono text-xs text-slate-400">{item.productId}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                          <td className="px-4 py-3">
                            {item.tagsAtPurchase?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {item.tagsAtPurchase.map((tag) => (
                                  <span
                                    key={`${item.productId}-${tag}`}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!order.products.length && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                            No items found for this order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Order ID</span>
                    <span className="font-mono text-xs text-slate-600">{order.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Status</span>
                    <span className="font-semibold text-slate-900">{order.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Lines</span>
                    <span className="font-semibold text-slate-900">{order.products.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Total qty</span>
                    <span className="font-semibold text-slate-900">{totalQty}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Total</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Customer</h2>

                <div className="mt-4 flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                        {(customer?.name || order.userId || 'U')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {customer?.name || 'Unknown customer'}
                    </div>
                    <div className="truncate text-xs text-slate-500">{customer?.email || '—'}</div>
                    <div className="truncate text-xs text-slate-500">{phone || '—'}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Client type</span>
                    <span className="font-semibold text-slate-900">{customer?.clientType || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Email verified</span>
                    <span className="font-semibold text-slate-900">
                      {customer?.isEmailVerified == null ? '—' : customer.isEmailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Account status</span>
                    <span className="font-semibold text-slate-900">{customer?.status || '—'}</span>
                  </div>
                  {customer?.company?.name && (
                    <div className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{customer.company.name}</div>
                      {customer.company.address && (
                        <div className="mt-1 text-xs text-slate-600">{customer.company.address}</div>
                      )}
                      {customer.company.phone && (
                        <div className="mt-1 text-xs text-slate-600">{customer.company.phone}</div>
                      )}
                      {customer.company.website && (
                        <div className="mt-1 text-xs text-slate-600">{customer.company.website}</div>
                      )}
                    </div>
                  )}
                  {verificationHref && (
                    <a
                      href={verificationHref}
                      download
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                    >
                      Download verification document
                    </a>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Shipping addresses</h2>
                <div className="mt-4 space-y-3">
                  {customer?.shippingAddresses?.length ? (
                    customer.shippingAddresses.map((addr, index) => (
                      <div
                        key={addr.id || `${order.id}-shipping-${index}`}
                        className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900">{addr.fullName || '—'}</div>
                          {addr.isDefault && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postalCode, addr.country]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">{addr.phone || '—'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
                      No saved shipping addresses.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
