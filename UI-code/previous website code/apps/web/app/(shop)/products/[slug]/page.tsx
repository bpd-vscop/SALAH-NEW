// filepath: apps/web/app/(shop)/products/[slug]/page.tsx
// Product detail page

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Product: {slug}</h1>
      <div className="mt-4">
        <p className="text-gray-600">Product details will be displayed here.</p>
      </div>
    </div>
  )
}