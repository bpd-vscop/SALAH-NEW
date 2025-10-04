// filepath: apps/web/app/(shop)/categories/[category]/page.tsx
// Category detail page
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { Card, CardContent, Badge, Button } from "@automotive/ui";
import { ShoppingCart } from "lucide-react";

interface CategoryDetailPageProps {
  params: Promise<{ category: string }>
}

export default function CategoryDetailPage({ params: paramsPromise }: CategoryDetailPageProps) {
  const [params] = useState(() => paramsPromise);
  const [currentPage, setCurrentPage] = useState(1);
  const [categorySlug, setCategorySlug] = useState<string>("");

  // Unwrap params on mount
  React.useEffect(() => {
    paramsPromise.then(resolvedParams => {
      setCategorySlug(resolvedParams.category);
    });
  }, [paramsPromise]);

  // Get category details
  const { data: categories = [] } = api.categories.getAll.useQuery();
  const category = categories.find(cat => cat.slug === categorySlug);

  // Get products for this category
  const { data: productsData, isLoading, error } = api.products.getAll.useQuery({
    limit: 12,
    page: currentPage,
    categoryId: category?.id,
  }, {
    enabled: !!category?.id // Only run query when we have category ID
  });

  const handleAddToCart = (productId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Adding product ${productId} to cart`);
  };

  if (!categorySlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-6">The category "{categorySlug}" does not exist.</p>
          <Link href="/" className="text-red-600 hover:text-red-700 font-medium">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-200 animate-pulse h-8 w-64 rounded mb-4"></div>
          <div className="bg-gray-200 animate-pulse h-4 w-96 rounded mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="bg-gray-200 animate-pulse aspect-[3/4] rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Products</h1>
          <p className="text-gray-600 mb-6">Failed to load products for this category.</p>
          <Link href="/" className="text-red-600 hover:text-red-700 font-medium">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 text-lg">{category.description}</p>
          )}
          {products.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing {products.length} of {pagination?.total || 0} products
            </p>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="mx-auto h-16 w-16" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">There are currently no products in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="group relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={product.thumbnailImage || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {product.onSale && (
                      <Badge className="absolute top-2 left-2 bg-red-600 text-white">
                        Sale
                      </Badge>
                    )}
                    {product.newProduct && (
                      <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                        New
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 hover:text-white"
                      onClick={(e) => handleAddToCart(product.id, e)}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium line-clamp-2 text-sm mb-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.salePrice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 line-through">
                              ${product.regularPrice.toFixed(2)}
                            </span>
                            <span className="font-bold text-red-600">
                              ${product.salePrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">
                            ${product.regularPrice.toFixed(2)}
                          </span>
                        )}
                        {!product.inStock && (
                          <span className="text-xs text-red-500 mt-1">Out of Stock</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <Button
              variant="outline"
              disabled={!pagination.hasPrev}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              disabled={!pagination.hasNext}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
