// filepath: apps/admin/app/(dashboard)/orders/[id]/page.tsx
// Order detail page

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Order Details</h1>
      <p>Order ID: {id}</p>
      <div className="mt-4">
        <p className="text-gray-600">Order details will be implemented here.</p>
      </div>
    </div>
  )
}