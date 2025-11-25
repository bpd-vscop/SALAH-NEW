import { formatCurrency, formatTimestamp } from '../../utils/format';
import { StatusPill } from '../common/StatusPill';
import type { Order, OrderStatus } from '../../types/api';
import { Select } from '../ui/Select';

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
    <div className="h-1" />
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
                    <Select
                      value={order.status}
                      onChange={(value) => onUpdateStatus(order.id, value as OrderStatus)}
                      options={orderStatuses.map((status) => ({
                        value: status,
                        label: status,
                      }))}
                      placeholder="Select status"
                      className="min-w-[150px]"
                    />
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

