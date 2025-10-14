import { formatCurrency, formatTimestamp } from '../../utils/format';
import { StatusPill } from '../../components/common/StatusPill';
import type { Order, OrderStatus } from '../../types/api';

interface OrdersAdminSectionProps {
  orders: Order[];
  canEditOrders: boolean;
  orderStatuses: OrderStatus[];
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
}

export const OrdersAdminSection: React.FC<OrdersAdminSectionProps> = ({
  orders,
  canEditOrders,
  orderStatuses,
  onUpdateStatus,
}) => (
  <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
        <p className="text-sm text-muted">Monitor fulfillment and update statuses.</p>
      </div>
    </div>
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold text-right">Total</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {orders.map((order) => {
            const total = order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
            return (
              <tr key={order.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.id.slice(-6)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{order.userId}</td>
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
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  {formatCurrency(total)}
                </td>
                <td className="px-4 py-3 text-right">
                  {canEditOrders ? (
                    <select
                      value={order.status}
                      onChange={(event) => onUpdateStatus(order.id, event.target.value as OrderStatus)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted">No access</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!orders.length && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

