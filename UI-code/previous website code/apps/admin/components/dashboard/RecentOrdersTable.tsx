// filepath: apps/admin/components/dashboard/RecentOrdersTable.tsx
"use client";

import { formatCurrency } from "../../lib/utils/format";

export type RecentOrder = {
  id: string;
  orderId: string;
  createdAt: string | Date; // ISO or Date
  customerName: string;
  category?: string | null;
  status: string; // accept full backend enum range
  itemsCount: number;
  total: number;
};

export default function RecentOrdersTable({
  orders,
  currency = "USD",
  loading,
}: {
  orders: RecentOrder[];
  currency?: string;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pe-4 ps-3">Product info</th>
            <th className="py-2 pe-4">Order Id</th>
            <th className="py-2 pe-4">Date</th>
            <th className="py-2 pe-4">Customer</th>
            <th className="py-2 pe-4">Category</th>
            <th className="py-2 pe-4">Status</th>
            <th className="py-2 pe-4">Items</th>
            <th className="py-2 pe-4">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="py-2 pe-4 ps-3">
                {/* Placeholder: if you have a product thumbnail, use it here */}
                <div className="h-8 w-8 rounded-md bg-muted" />
              </td>
              <td className="py-2 pe-4">{o.orderId}</td>
              <td className="py-2 pe-4">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="py-2 pe-4">{o.customerName}</td>
              <td className="py-2 pe-4">{o.category ?? "—"}</td>
              <td className="py-2 pe-4">
                <span className="rounded-full bg-muted px-2 py-1 text-xs">{o.status}</span>
              </td>
              <td className="py-2 pe-4">{o.itemsCount}</td>
              <td className="py-2 pe-4">{formatCurrency(o.total, currency)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-muted-foreground">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
