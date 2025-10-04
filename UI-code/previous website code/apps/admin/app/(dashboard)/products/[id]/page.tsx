// filepath: apps/admin/app/(dashboard)/products/[id]/page.tsx
// Product detail page

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Product Details</h1>
      <p>Product ID: {id}</p>
      <div className="mt-4">
        <p className="text-gray-600">Product details will be implemented here.</p>
      </div>
    </div>
  )
}