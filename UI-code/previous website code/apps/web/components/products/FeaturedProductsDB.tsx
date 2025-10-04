"use client";

import Image from "next/image";
import Link from "next/link";
import { api } from "../../lib/api";

export function FeaturedProductsDB() {
  const { data: products = [], isLoading, error } = api.products.getFeatured.useQuery({ limit: 8 });
  if (isLoading) return null;
  if (error) return null;
  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <Link key={p.id} href={`/products/${p.slug || p.sku}`} className="border rounded-md overflow-hidden bg-white shadow-sm hover:shadow-md transition">
          <div className="relative w-full aspect-[4/3] bg-gray-100">
            <Image src={p.thumbnailImage || p.images[0] || "/placeholder.png"} alt={p.name} fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
          </div>
          <div className="p-3">
            <div className="text-sm text-gray-500">{p.brand}</div>
            <div className="font-medium text-gray-900 line-clamp-2">{p.name}</div>
            <div className="mt-1 text-sm">
              {p.salePrice ? (
                <>
                  <span className="text-red-600 font-semibold">${p.salePrice.toFixed(2)}</span>
                  <span className="text-gray-400 line-through ml-2">${p.regularPrice.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-gray-900 font-semibold">${p.regularPrice.toFixed(2)}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}



