"use client";

import { api } from "../../lib/api";

export function FeaturedManufacturers() {
  const { data } = api.products.getAll.useQuery({ limit: 50, page: 1, sortBy: 'featured' as any });
  const brands = Array.from(new Set((data?.items || data || []).map((p: any) => p.brand).filter(Boolean))).slice(0, 12);
  if (!brands.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {brands.map((b) => (
        <div key={b} className="border rounded-md p-4 text-center bg-white shadow-sm">
          <span className="font-semibold text-gray-800">{b}</span>
        </div>
      ))}
    </div>
  );
}



