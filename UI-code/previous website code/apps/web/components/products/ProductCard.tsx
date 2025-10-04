// filepath: automotive-salah/packages/ui/components/products/ProductCard.tsx
"use client";

import React from "react";
import { Button } from "@automotive/ui";

interface ProductCardProps {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image?: string;
  description?: string;
  badge?: string;
  badgeColor?: "green" | "blue" | "red" | "yellow";
}

export function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  description,
  badge,
  badgeColor = "blue",
}: ProductCardProps) {
  const badgeColors = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <div className="h-48 bg-gray-200 flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-500">Product Image</span>
          )}
        </div>
        {badge && (
          <span
            className={`absolute top-2 right-2 ${badgeColors[badgeColor]} text-white px-2 py-1 text-xs font-bold rounded`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{name}</h3>
        {description && (
          <p className="text-gray-600 text-sm mb-3">{description}</p>
        )}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-blue-600">{price}</span>
            {originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                {originalPrice}
              </span>
            )}
          </div>
          <Button size="sm">Add to Cart</Button>
        </div>
      </div>
    </div>
  );
}
