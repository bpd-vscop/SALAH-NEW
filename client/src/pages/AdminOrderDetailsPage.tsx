import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, MessageSquare, Download, MapPin, Building2, Mail, Phone, CheckCircle } from 'lucide-react';
import { ordersApi } from '../api/orders';
import type { Order, OrderStatus } from '../types/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { adminTabs, getMenuIcon } from '../utils/adminSidebar';
import { cn } from '../utils/cn';
import { Select } from '../components/ui/Select';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const resolveUploadsHref = (value?: string | null) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  return `/uploads/${trimmed.replace(/^\/+/, '')}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${datePart} - ${timePart}`;
  } catch {
    return value;
  }
};

const formatPaymentMethod = (order?: Order | null) => {
  const method = order?.paymentMethod;
  if (method === 'paypal') return 'PayPal';
  if (method === 'stripe') {
    const last4 = order?.paymentDetails?.last4;
    return last4 ? `Card •••• ${last4}` : 'Card';
  }
  if (method === 'none') return 'Not specified';
  return 'Not specified';
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

  const subtotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.subtotal === 'number') return order.subtotal;
    return order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order]);

  const discount = order?.discountAmount ?? order?.coupon?.discountAmount ?? 0;
  const taxAmount = order?.taxAmount ?? 0;
  const shippingCost = order?.shippingCost ?? 0;
  const carrierName = order?.shippingRateInfo?.carrierName ?? null;
  const carrierId = order?.shippingRateInfo?.carrierId ?? null;
  const serviceName = order?.shippingRateInfo?.serviceName ?? null;
  const storedTotal = order?.total;
  const total = useMemo(() => {
    if (typeof storedTotal === 'number') return storedTotal;
    return Math.max(0, subtotal - discount) + taxAmount + shippingCost;
  }, [discount, shippingCost, storedTotal, subtotal, taxAmount]);

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

  const handleChatClick = () => {
    if (order?.userId) {
      navigate('/admin', { state: { active: 'messages', clientId: order.userId } });
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin', { state: { active: 'orders' } })}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {order ? `Order #${order.id.slice(-6)}` : 'Order'}
                </h1>
                {order && (
                  <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                    ID <span className="font-mono text-[11px] text-slate-500">{order.id}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-700">{order ? formatDate(order.createdAt) : '-'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1">
                  <span className="text-slate-500">Updated</span>
                  <span className="text-slate-700">
                    {order ? formatDate(order.updatedAt ?? order.createdAt) : '-'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {order && (
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order status</div>
                <div className="mt-2 min-w-[200px]">
                  <Select
                    value={order.status}
                    onChange={(value) => handleStatusChange(value as OrderStatus)}
                    options={ORDER_STATUSES.map((status) => ({
                      value: status,
                      label: status.charAt(0).toUpperCase() + status.slice(1),
                    }))}
                    disabled={!canEdit || saving}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm text-muted">Loading order...</p>
          </div>
        )}

        {!loading && order && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Items */}
              <section className="rounded-2xl border border-border bg-surface shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Items</h2>
                  <span className="text-sm text-muted">
                    {order.products.length} line{order.products.length !== 1 ? 's' : ''} | {totalQty} item{totalQty !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-left text-sm">
                    <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Product</th>
                        <th className="px-6 py-3 font-semibold text-center">Qty</th>
                        <th className="px-6 py-3 font-semibold text-right">Price</th>
                        <th className="px-6 py-3 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.products.map((item) => (
                        <tr key={`${order.id}-${item.productId}`} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                                <Package className="h-5 w-5 text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900">{item.name}</p>
                                <p className="font-mono text-xs text-muted">{item.productId.slice(-12)}</p>
                                {item.tagsAtPurchase?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {item.tagsAtPurchase.map((tag) => (
                                      <span
                                        key={`${item.productId}-${tag}`}
                                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-700">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(item.price)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                      {!order.products.length && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted">
                            No items in this order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border bg-slate-50/50 px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Subtotal</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          Discount{order?.coupon?.code ? ` (${order.coupon.code})` : ''}
                        </span>
                        <span className="text-sm font-semibold text-emerald-600">
                          -{formatCurrency(discount)}
                        </span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          Tax{order?.taxRate ? ` (${order.taxRate}%)` : ''}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Shipping</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(shippingCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Total</span>
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Payment method: {formatPaymentMethod(order)}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Customer */}
              <section className="rounded-2xl border border-border bg-surface shadow-sm">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                          {(customer?.name || order.userId || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {customer?.name || 'Unknown customer'}
                        </p>
                        {customer?.clientType && (
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            customer.clientType === 'B2B'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          )}>
                            {customer.clientType}
                          </span>
                        )}
                      </div>
                      {customer?.email && (
                        <p className="truncate text-sm text-muted">{customer.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {customer?.email && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-muted" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-muted" />
                        <span>{phone}</span>
                      </div>
                    )}
                    {customer?.isEmailVerified && (
                      <div className="flex items-center gap-3 text-sm text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Email verified</span>
                      </div>
                    )}
                  </div>

                  {customer?.company?.name && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        <Building2 className="h-3.5 w-3.5" />
                        Company
                      </div>
                      <p className="mt-1 font-semibold text-slate-900">{customer.company.name}</p>
                      {customer.company.website && (
                        <p className="mt-0.5 text-sm text-muted">{customer.company.website}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleChatClick}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </button>
                    {verificationHref && (
                      <a
                        href={verificationHref}
                        download
                        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Shipping Carrier */}
              <section className="rounded-2xl border border-border bg-surface shadow-sm">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">Shipping Carrier</h2>
                </div>
                <div className="p-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Carrier</span>
                    <span className="font-semibold text-slate-900">{carrierName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Carrier ID</span>
                    <span className="font-semibold text-slate-900">{carrierId || '—'}</span>
                  </div>
                  {serviceName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Service</span>
                      <span className="font-semibold text-slate-900">{serviceName}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Shipping */}
              {customer?.shippingAddresses && customer.shippingAddresses.length > 0 && (
                <section className="rounded-2xl border border-border bg-surface shadow-sm">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Shipping</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    {customer.shippingAddresses.map((addr, index) => (
                      <div
                        key={addr.id || `${order.id}-shipping-${index}`}
                        className={cn(
                          'rounded-xl p-4',
                          addr.isDefault ? 'bg-primary/5 border border-primary/20' : 'bg-slate-50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className={cn(
                            'h-4 w-4 mt-0.5 flex-shrink-0',
                            addr.isDefault ? 'text-primary' : 'text-muted'
                          )} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{addr.fullName || '-'}</p>
                              {addr.isDefault && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {[addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-sm text-slate-600">
                              {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-sm text-slate-600">{addr.country}</p>
                            {addr.phone && (
                              <p className="mt-1 text-sm text-muted">{addr.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </aside>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
