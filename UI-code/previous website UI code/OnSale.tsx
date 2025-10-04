// filepath: automotive-salah/packages/ui/components/ui/products/OnSale.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent, Badge, Button, cn } from "@automotive/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

// Product data for "On Sale" section
const inSaleProducts = [
  {
    id: 11,
    title: "Lexus RX Smart Key - Special Offer",
    price: 125.5,
    originalPrice: 150.0,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem1",
  },
  {
    id: 12,
    title: "Nissan Altima Key Fob - Discounted",
    price: 75.0,
    originalPrice: 95.0,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem2",
  },
  {
    id: 13,
    title: "Jeep Wrangler Remote Key - Limited Time Price",
    price: 99.99,
    originalPrice: 119.99,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem3",
  },
  {
    id: 14,
    title: "Subaru Forester Key - Hot Deal",
    price: 82.75,
    originalPrice: 102.75,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem4",
  },
  {
    id: 15,
    title: "Volkswagen Golf Smart Key - Sale",
    price: 110.0,
    originalPrice: 130.0,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem5",
  },
  {
    id: 16,
    title: "Mazda CX-5 Advanced Key - Clearance",
    price: 90.99,
    originalPrice: 115.99,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem6",
  },
  {
    id: 17,
    title: "Hyundai Sonata Remote - Reduced Price",
    price: 65.0,
    originalPrice: 85.0,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem7",
  },
  {
    id: 18,
    title: "Kia Sorento Key Fob - Special Discount With A Long Name",
    price: 105.2,
    originalPrice: 125.2,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem8",
  },
  {
    id: 19,
    title: "Another Discounted Key",
    price: 59.99,
    originalPrice: 79.99,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem9",
  },
  {
    id: 20,
    title: "Smart Key Bargain For You",
    price: 109.5,
    originalPrice: 139.5,
    image: "/placeholder.svg?height=200&width=200&text=SaleItem10",
  },
];

// Embla options for infinite loop and drag
const emblaOptions = {
  loop: true,
  align: "start" as const,
  containScroll: "trimSnaps" as const,
  slidesToScroll: 1,
  dragFree: true,
};

export function OnSale() {
  const { data: saleProducts = [], isLoading, error } = api.products.getOnSale.useQuery({
    limit: 8
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Convert database products to component format
  const productsToDisplay = saleProducts.length > 0 ? saleProducts.map(product => ({
    id: product.id,
    title: product.name,
    price: product.salePrice || product.regularPrice,
    originalPrice: product.regularPrice,
    image: product.thumbnailImage,
    slug: product.slug,
  })) : inSaleProducts;

  // Auto-slide functionality
  useEffect(() => {
    if (!emblaApi || isPaused) return;
    const autoSlide = setInterval(() => {
      if (!isPaused) {
        emblaApi.scrollPrev();
      }
    }, 3000); // Slide every 3.5 seconds (slightly different from BackInStock)
    return () => clearInterval(autoSlide);
  }, [emblaApi, isPaused]);

  // Embla Navigation Callbacks and Effect
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      if (emblaApi) {
        emblaApi.off("select", onSelect);
        emblaApi.off("reInit", onSelect);
      }
    };
  }, [emblaApi, onSelect]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="group/carousel">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">On Sale</h2>
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex-[0_0_20%] min-w-0">
              <div className="bg-gray-200 animate-pulse aspect-square rounded-lg mb-3"></div>
              <div className="bg-gray-200 animate-pulse h-4 rounded mb-2"></div>
              <div className="bg-gray-200 animate-pulse h-4 w-3/4 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Failed to load sale products:', error);
    return (
      <div className="group/carousel">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">On Sale</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load sale products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/carousel">
      {/* Header Row: Contains Title and Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-800">
          On Sale
        </h2>
        {/* Navigation Buttons */}
        <div className="hidden md:flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="rounded-full hover:bg-red-50 hover:border-red-300"
            disabled={!emblaOptions.loop && prevBtnDisabled}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="rounded-full hover:bg-red-50 hover:border-red-300"
            disabled={!emblaOptions.loop && nextBtnDisabled}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>

      {/* Embla Viewport */}
      <div
        className="overflow-hidden relative pl-2 md:pl-3 lg:pl-4"
        ref={emblaRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Embla Container */}
        <div className="flex">
          {productsToDisplay.map((product, index) => (
            <div
              key={product.id}
              className="relative flex-[0_0_55%] sm:flex-[0_0_33.33%] md:flex-[0_0_25%] lg:flex-[0_0_20%] min-w-0 pr-4 py-4 pb-6"
              onMouseEnter={() => setHoveredProduct(index)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Card */}
              <Link href={'slug' in product && product.slug ? `/products/${product.slug}` : '#'}>
                <Card
                  className={cn(
                    "group w-full h-full overflow-hidden rounded-lg border shadow-sm flex flex-col cursor-pointer",
                    "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
                    hoveredProduct === index
                      ? "ring-2 ring-red-500 shadow-lg scale-[1.02]"
                      : "",
                  )}
                >
                {/* Image Container */}
                <div className="aspect-square relative flex-shrink-0 overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.title}
                    fill
                    className={cn(
                      "object-cover transition-transform duration-300 ease-in-out",
                      hoveredProduct === index
                        ? "scale-105"
                        : "group-hover:scale-105",
                    )}
                    sizes="(max-width: 639px) 55vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
                  />
                  <Badge className="absolute top-2 right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 z-[1]">
                    On Sale
                  </Badge>
                </div>

                {/* Card Content */}
                <CardContent className="p-3 flex flex-col flex-grow">
                  {/* Title */}
                  <h3
                    className={cn(
                      "font-medium text-sm leading-snug truncate mb-1 transition-colors duration-300",
                      hoveredProduct === index
                        ? "text-red-700"
                        : "group-hover:text-red-700",
                    )}
                  >
                    {product.title}
                  </h3>
                  {/* Price */}
                  <div className="mt-auto text-right">
                    {/* Original price if available and different */}
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-xs text-gray-500 line-through mr-1">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    <span
                      className={cn(
                        "font-bold text-base md:text-lg text-red-600 transition-all duration-300",
                        hoveredProduct === index
                          ? "translate-y-[-2px]"
                          : "group-hover:translate-y-[-2px]",
                      )}
                    >
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              </Link>
            </div>
          ))}
        </div>

        {/* Fade Overlays */}
        <div className="absolute inset-y-0 left-0 w-6 md:w-8 lg:w-10 bg-gradient-to-r from-[#f9fafb] to-transparent z-10 pointer-events-none hidden md:block" />
        <div className="absolute inset-y-0 right-0 w-6 md:w-8 lg:w-10 bg-gradient-to-l from-[#f9fafb] to-transparent z-10 pointer-events-none hidden md:block" />
      </div>
    </div>
  );
}


