// filepath: apps/web/app/(account)/orders/[orderId]/page.tsx
// Customer order detail page

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Order Details</h1>
      <p>Order ID: {orderId}</p>
      <div className="mt-4">
        <p className="text-gray-600">Order details will be implemented here.</p>
      </div>
    </div>
  )
}