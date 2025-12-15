import { formatCurrency, formatTimestamp } from '../../utils/format';
import { StatusPill } from '../common/StatusPill';
import type { Order, OrderStatus } from '../../types/api';
import { Select } from '../ui/Select';
import { useNavigate } from 'react-router-dom';

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
}) => {
  const navigate = useNavigate();

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="h-1" />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-[1100px] divide-y divide-border text-left text-sm">
          <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Items</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {orders.map((order) => {
              const total = order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
              const lineItems = order.products.length;
              const totalQty = order.products.reduce((sum, item) => sum + item.quantity, 0);
              const customerName = order.user?.name || 'Unknown customer';
              const customerEmail = order.user?.email || null;
              const customerType = order.user?.clientType || '-';

              return (
                <tr
                  key={order.id}
                  className="cursor-pointer transition hover:bg-primary/5"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-slate-600">{order.id.slice(-6)}</div>
                    <div className="text-xs text-slate-400">{order.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{customerName}</div>
                    <div className="text-xs text-slate-500">{customerEmail || order.userId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{customerType}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{lineItems} lines</div>
                    <div className="text-xs text-slate-500">{totalQty} qty</div>
                  </td>
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
                  <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(order.updatedAt)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(total)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
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
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
