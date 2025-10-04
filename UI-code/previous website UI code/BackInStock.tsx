// filepath: automotive-salah/packages/ui/components/products/BackInStock.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";

import Image from "next/image";
import Link from "next/link";

import useEmblaCarousel from "embla-carousel-react";

import { Card, CardContent, Badge, Button, cn } from "@automotive/ui";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

// Product data remains the same

const backInStockProducts = [
  {
    id: 1,

    title: "Chrysler 300 Smart Remote Key",

    price: 79.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 2,

    title:
      "Honda Accord Remote Key Fob with Extra Long Description That Must Be Truncated",

    price: 89.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 3,

    title: "Toyota Camry Transponder Key",

    price: 99.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 4,

    title: "Ford F-150 Remote Key",

    price: 109.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 5,

    title: "Chevrolet Silverado Key Fob",

    price: 119.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 6,

    title:
      "BMW 3 Series Very Long Title Example To Test Text Truncation Ability On A Single Line",

    price: 129.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 7,

    title: "Mercedes-Benz E-Class Key",

    price: 139.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 8,

    title: "Audi A4 Smart Key With A Bit More Text",

    price: 149.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 9,

    title: "Another Product Key Fob",

    price: 69.99,

    image: "/placeholder.svg?height=200&width=200",
  },

  {
    id: 10,

    title: "Yet Another Smart Key Thing",

    price: 119.99,

    image: "/placeholder.svg?height=200&width=200",
  },
];

// Embla options for infinite loop and drag

const emblaOptions = {
  loop: true,

  align: "start" as const, // Type assertion to make TypeScript happy

  containScroll: "trimSnaps" as const, // Type assertion for containScroll

  slidesToScroll: 1,

  dragFree: true,
};

export function BackInStock() {
  // Use general products query for back in stock items (in real app, you'd have a specific query)
  const { data: stockProducts, isLoading, error } = api.products.getAll.useQuery({
    limit: 8
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);

  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  const [isPaused, setIsPaused] = useState(false);

  // Convert database products to component format
  const dbProducts = stockProducts?.products || [];
  const productsToDisplay = dbProducts.length > 0 
    ? dbProducts.map(product => ({
        id: product.id,
        title: product.name,
        price: product.salePrice || product.regularPrice,
        image: product.thumbnailImage,
        slug: product.slug,
      })) 
    : backInStockProducts;

  // Auto-slide functionality

  useEffect(() => {
    if (!emblaApi || isPaused) return;

    const autoSlide = setInterval(() => {
      if (!isPaused) {
        emblaApi.scrollNext();
      }
    }, 2500); // Slide every 3 seconds

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
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">Back in Stock</h2>
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
    console.error('Failed to load back in stock products:', error);
    return (
      <div className="group/carousel">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">Back in Stock</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load back in stock products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/carousel">
      {/* Header Row: Contains Title and Buttons */}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-800">
          Back in Stock
        </h2>

        {/* Navigation Buttons */}

        <div className="hidden md:flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="rounded-full hover:bg-green-50 hover:border-green-300"
            disabled={!emblaOptions.loop && prevBtnDisabled}
          >
            <ChevronLeft className="h-4 w-4" />

            <span className="sr-only">Previous</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="rounded-full hover:bg-green-50 hover:border-green-300"
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
                      ? "ring-2 ring-green-500 shadow-lg scale-[1.02]"
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

                  <Badge className="absolute top-2 right-2 bg-green-700 text-white text-xs px-1.5 py-0.5 z-[1]">
                    Back in Stock
                  </Badge>
                </div>

                {/* Card Content */}

                <CardContent className="p-3 flex flex-col flex-grow">
                  {/* Title */}

                  <h3
                    className={cn(
                      "font-medium text-sm leading-snug truncate mb-1 transition-colors duration-300",

                      hoveredProduct === index
                        ? "text-green-700"
                        : "group-hover:text-green-700",
                    )}
                  >
                    {product.title}
                  </h3>

                  {/* Price */}

                  <div
                    className={cn(
                      "mt-auto text-right font-bold text-base md:text-lg text-green-600 transition-all duration-300",

                      hoveredProduct === index
                        ? "translate-y-[-2px]"
                        : "group-hover:translate-y-[-2px]",
                    )}
                  >
                    ${product.price.toFixed(2)}
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


