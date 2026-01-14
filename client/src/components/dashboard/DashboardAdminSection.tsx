import { useMemo } from 'react';
import { AlertTriangle, BarChart3, MessageSquare, Package, ShoppingCart, Timer, TrendingUp } from 'lucide-react';
import type { Order, OrderStatus, Product } from '../../types/api';
import { formatCurrency, formatTimestamp } from '../../utils/format';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);

const getOrderSubtotal = (order: Order) =>
  order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);

const getOrderTotal = (order: Order) => {
  const subtotal = getOrderSubtotal(order);
  const discount = order.coupon?.discountAmount ?? 0;
  const taxAmount = order.taxAmount ?? 0;
  return Math.max(0, subtotal - discount) + taxAmount;
};

const getOrderTimestamp = (order: Order) => {
  const value = order.createdAt ?? order.updatedAt;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const statusTone: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const statusDot: Record<OrderStatus, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
};

interface DashboardAdminSectionProps {
  orders: Order[];
  products: Product[];
  categoriesCount: number;
  manufacturersCount: number;
  unreadMessages: number;
  lowStockIds: string[];
  onNavigate?: (tabId: string, dropdownId?: string) => void;
}

export const DashboardAdminSection: React.FC<DashboardAdminSectionProps> = ({
  orders,
  products,
  categoriesCount,
  manufacturersCount,
  unreadMessages,
  lowStockIds,
  onNavigate,
}) => {
  const {
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    ordersLast30Days,
    revenueLast30Days,
    recentOrders,
    avgOrderValue,
  } = useMemo(() => {
    const now = Date.now();
    const since = now - THIRTY_DAYS_MS;

    let pending = 0;
    let processing = 0;
    let completed = 0;
    let cancelled = 0;
    let last30Count = 0;
    let last30Revenue = 0;
    let last30RevenueCount = 0;
    const recent: Array<{ order: Order; timestamp: number }> = [];

    orders.forEach((order) => {
      switch (order.status) {
        case 'pending':
          pending += 1;
          break;
        case 'processing':
          processing += 1;
          break;
        case 'completed':
          completed += 1;
          break;
        case 'cancelled':
          cancelled += 1;
          break;
        default:
          break;
      }

      const timestamp = getOrderTimestamp(order);
      if (timestamp) {
        recent.push({ order, timestamp });
      }
      if (timestamp >= since) {
        last30Count += 1;
        if (order.status !== 'cancelled') {
          last30Revenue += getOrderTotal(order);
          last30RevenueCount += 1;
        }
      }
    });

    recent.sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalOrders: orders.length,
      pendingOrders: pending,
      processingOrders: processing,
      completedOrders: completed,
      cancelledOrders: cancelled,
      ordersLast30Days: last30Count,
      revenueLast30Days: last30Revenue,
      recentOrders: recent.slice(0, 4).map((entry) => entry.order),
      avgOrderValue: last30RevenueCount ? last30Revenue / last30RevenueCount : 0,
    };
  }, [orders]);

  const lowStockItems = useMemo(() => {
    if (!lowStockIds.length) return [];
    const idSet = new Set(lowStockIds);
    return products
      .filter((product) => idSet.has(product.id))
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku ?? null,
        quantity: typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0,
        threshold:
          typeof product.inventory?.lowStockThreshold === 'number' ? product.inventory.lowStockThreshold : 0,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6);
  }, [products, lowStockIds]);

  const outOfStockCount = useMemo(
    () =>
      products.filter((product) => {
        if (product.manageStock === false) return false;
        const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
        return quantity <= 0;
      }).length,
    [products]
  );

  const trackedStockCount = useMemo(
    () => products.filter((product) => product.manageStock !== false).length,
    [products]
  );

  const statCards = [
    {
      label: 'Total orders',
      value: formatCount(totalOrders),
      helper: `${formatCount(ordersLast30Days)} last 30 days`,
      icon: ShoppingCart,
      tone: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Pending orders',
      value: formatCount(pendingOrders),
      helper: `${formatCount(processingOrders)} processing`,
      icon: Timer,
      tone: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Sales (30 days)',
      value: formatCurrency(revenueLast30Days),
      helper: `Avg ${formatCurrency(avgOrderValue)}`,
      icon: TrendingUp,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Products',
      value: formatCount(products.length),
      helper: `${formatCount(trackedStockCount)} tracked`,
      icon: Package,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Low stock',
      value: formatCount(lowStockIds.length),
      helper: `${formatCount(outOfStockCount)} out of stock`,
      icon: AlertTriangle,
      tone: 'bg-rose-100 text-rose-700',
    },
    {
      label: 'Unread messages',
      value: formatCount(unreadMessages),
      helper: 'Need review',
      icon: MessageSquare,
      tone: 'bg-indigo-100 text-indigo-700',
    },
  ];

  const statusItems: Array<{ id: OrderStatus; label: string; count: number }> = [
    { id: 'pending', label: 'Pending', count: pendingOrders },
    { id: 'processing', label: 'Processing', count: processingOrders },
    { id: 'completed', label: 'Completed', count: completedOrders },
    { id: 'cancelled', label: 'Cancelled', count: cancelledOrders },
  ];

  const catalogStats = [
    { label: 'Products', value: formatCount(products.length) },
    { label: 'Categories', value: formatCount(categoriesCount) },
    { label: 'Manufacturers', value: formatCount(manufacturersCount) },
    { label: 'Stock tracked', value: formatCount(trackedStockCount) },
    { label: 'Low stock', value: formatCount(lowStockIds.length) },
    { label: 'Out of stock', value: formatCount(outOfStockCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">At-a-glance stats for orders, inventory, and activity.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('orders')}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            View orders
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('products', 'inventory')}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Inventory
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('messages')}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('users')}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Staff & clients
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Orders overview</h2>
                <p className="text-sm text-slate-500">Summary of the current order pipeline.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('orders')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View all
              </button>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="space-y-2">
                {statusItems.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDot[status.id]}`} />
                      {status.label}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCount(status.count)}</span>
                  </div>
                ))}
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Last 30 days</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatCount(ordersLast30Days)} orders
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sales {formatCurrency(revenueLast30Days)} | Avg {formatCurrency(avgOrderValue)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Recent orders</h3>
                {recentOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No orders yet.
                  </div>
                ) : (
                  recentOrders.map((order) => {
                    const total = getOrderTotal(order);
                    const customerLabel = order.user?.name || order.user?.email || 'Customer';
                    const timestamp = order.createdAt ?? order.updatedAt;
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              Order #{order.id.slice(-6)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone[order.status]}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{customerLabel}</p>
                          <p className="text-xs text-slate-400">{formatTimestamp(timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(total)}</p>
                          <p className="text-xs text-slate-400">{order.products.length} items</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inventory watch</h2>
                <p className="text-sm text-slate-500">Low stock items to review.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('products', 'inventory')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open
              </button>
            </div>
            <div className="space-y-3 p-6">
              {lowStockItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No low stock alerts right now.
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      {item.sku && <p className="text-xs text-slate-500">SKU {item.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-rose-600">{formatCount(item.quantity)}</p>
                      <p className="text-xs text-slate-500">Threshold {formatCount(item.threshold)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Catalog snapshot</h2>
                <p className="text-sm text-slate-500">Current catalog coverage.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('categories')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Catalog
              </button>
            </div>
            <div className="grid gap-1.5 p-2 sm:grid-cols-2">
              {catalogStats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

