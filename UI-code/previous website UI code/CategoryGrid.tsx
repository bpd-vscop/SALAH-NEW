// filepath: automotive-salah/packages/ui/components/products/CategoryGrid.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { api } from "../../lib/api";

export function CategoryGrid() {
  const { data: categories = [], isLoading, error } = api.categories.getFeatured.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-8 p-4">
        {Array.from({ length: 18 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center text-center p-2">
            <div className="animate-pulse bg-gray-200 h-20 w-20 rounded-full mb-5"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Failed to load categories:', error);
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-8 p-4">
        <div className="col-span-full text-center py-8">
          <p className="text-gray-500">Failed to load categories</p>
        </div>
      </div>
    );
  }

  return (
    // Increased gap for more spacing between larger items

    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-8 p-4">
      {categories.map((category, index) => (
        <Link
          key={`${category.id}-${index}`}
          href={`/categories/${category.slug}`}
          className="group flex flex-col items-center text-center p-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {/* Icon Container - Increased size */}

          <div
            className="



              relative h-20 w-20 mb-5 /* Increased size (h/w-16 -> h/w-20), increased margin bottom */



              flex items-center justify-center



              rounded-full



              border-2 border-gray-200 dark:border-gray-700



              transition-all duration-300 ease-in-out



              group-hover:border-[#FF6F61]



              group-hover:scale-105



              bg-white dark:bg-gray-800



            "
          >
            {/* Image Component - Increased base size */}

            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                width={100} // Increased base width (was 80)
                height={100} // Increased base height (was 80)
                className="



                  absolute inset-0 m-auto



                  object-contain p-1



                  scale-110 /* Initial scale remains */



                  transition-all duration-300 ease-in-out



                  group-hover:scale-125 /* Hover scale remains */



                  z-10



                "
                sizes="(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 12vw" // Adjusted sizes estimate
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {category.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category Name - Increased font size */}

          <span
            className="



              text-base font-medium text-gray-700 dark:text-gray-300 /* Increased size (text-sm -> text-base) */



              transition-colors duration-300 ease-in-out



              group-hover:text-red-600"
          >
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}


