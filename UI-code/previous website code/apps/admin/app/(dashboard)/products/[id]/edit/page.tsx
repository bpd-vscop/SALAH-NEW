// filepath: apps/admin/app/(dashboard)/products/[id]/edit/page.tsx
// Product edit page

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Product</h1>
      <p>Product ID: {id}</p>
      <div className="mt-4">
        <p className="text-gray-600">Product edit form will be implemented here.</p>
      </div>
    </div>
  )
}