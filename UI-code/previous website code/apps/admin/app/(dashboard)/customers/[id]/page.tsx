// filepath: apps/admin/app/(dashboard)/customers/[id]/page.tsx
// Customer detail page

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customer Details</h1>
      <p>Customer ID: {id}</p>
      <div className="mt-4">
        <p className="text-gray-600">Customer details will be implemented here.</p>
      </div>
    </div>
  )
}