// filepath: automotive-salah/packages/ui/components/products/FeaturedProducts.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";

// Carousel data for the large feature panel
const carouselData = [
  {
    id: 1,
    imageSrc: "https://i.postimg.cc/wjQzdm7N/Screenshot-2025-04-22-161755.png",
    altText: "Professional automotive key cutting equipment",
    category: "AERO",
    offer: "30% OFF",
    title: "IN-STOCK SALE",
    caption: "Check out the great offers",
    ctaText: "SHOP NOW",
    ctaLink: "/sale/aero",
    price: "$149.99",
  },
  {
    id: 2,
    imageSrc:
      "https://m.media-amazon.com/images/I/71FzXOP+b-L._AC_UF894,1000_QL80_.jpg",
    altText: "Advanced diagnostic tools and equipment",
    category: "DIAGNOSTIC",
    offer: "25% OFF",
    title: "PRO TOOLS",
    caption: "Professional grade equipment",
    ctaText: "SHOP NOW",
    ctaLink: "/tools/diagnostic",
    price: "$299.99",
  },
  {
    id: 3,
    imageSrc: "https://i.ebayimg.com/images/g/GDwAAeSwCfFnvsR7/s-l1200.jpg",
    altText: "Premium key programming devices",
    category: "PROGRAMMING",
    offer: "40% OFF",
    title: "SMART KEYS",
    caption: "Latest technology solutions",
    ctaText: "SHOP NOW",
    ctaLink: "/programming/keys",
    price: "$459.99",
  },
];

// Small cards data (unchanged)
const smallCardsData = [
  {
    id: 4,
    isLarge: false,
    imageSrc:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Orange%20and%20Grey%20Modern%20Colorful%20Skinca-dddffcc.png/:/rs=w:982,h:982",
    altText: "Placeholder graphic for bike lights",
    category: "BIKE LIGHTING",
    offer: null,
    title: "STAY IN SIGHT",
    caption: null,
    ctaText: "SHOP NOW",
    ctaLink: "/accessories/lighting",
    badgeText: null,
    price: "$45.00",
  },
  {
    id: 5,
    isLarge: false,
    imageSrc:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Orange%20and%20Grey%20Modern%20Colorful%20Skinca-aa8fe5c.png/:/rs=w:982,h:982",
    altText: "Placeholder graphic for bike saddle",
    category: "ELITE BIKE SADDLE",
    offer: "10% OFF",
    title: "SELECT SADDLE",
    caption: null,
    ctaText: "SHOP NOW",
    ctaLink: "/components/saddles",
    badgeText: null,
    price: "$89.95",
  },
  {
    id: 6,
    isLarge: false,
    imageSrc:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Post%20de%20Instagram%20Ubicaci%C3%B3n%20y%20Horarios-e785029.png/:/rs=w:982,h:982",
    altText: "Placeholder graphic for urban bike",
    category: "URBAN BIKES",
    offer: null,
    title: "FIND YOUR FAST",
    caption: null,
    ctaText: "SHOP NOW",
    ctaLink: "/bikes/urban",
    badgeText: "BEST DEAL",
    price: "$799.00",
  },
  {
    id: 7,
    isLarge: false,
    imageSrc:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/WhatsApp%20Image%202025-04-22%20at%2011.41.11_83884d2e.jpg/:/rs=w:982,h:982",
    altText: "Placeholder graphic for pedals",
    category: "PEDAL SET",
    offer: "UP TO 15% OFF",
    title: null,
    caption: null,
    ctaText: "SHOP NOW",
    ctaLink: "/components/pedals",
    badgeText: null,
    price: "$64.50",
  },
];

// Helper component for the Shop Now link style
const StyledShopNow = ({ text }: { text: string }) => (
  <div className="inline-block mt-1.5 border-b border-red-600 group-hover:border-red-600 transition-colors duration-200 md:mt-2 md:border-b-2">
    <span className="text-[0.65rem] font-semibold text-white uppercase tracking-wider group-hover:text-red-600 transition-colors duration-200 md:text-xs">
      {text}
    </span>
  </div>
);

// Price Tag Component
const PriceTag = ({ price }: { price: string | null }) => {
  if (!price) return null;
  return (
    <div className="absolute bottom-2 right-2 z-10 bg-black/70 backdrop-blur-sm text-white px-1.5 py-0 rounded shadow-sm pointer-events-none md:bottom-4 md:right-4 md:px-3 md:py-1 md:rounded-md md:shadow-md">
      <span className="text-[0.7rem] font-semibold md:text-sm">{price}</span>
    </div>
  );
};

// Navigation Arrow Component with Enhanced Visibility
const NavArrow = ({
  direction,
  onClick,
  disabled = false,
}: {
  direction: "left" | "right";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    disabled={disabled}
    className={`absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14
                   bg-black/40 backdrop-blur-md border border-white/20 rounded-full
                   hover:bg-black/60 hover:border-white/40 transition-all duration-300
                   flex items-center justify-center group shadow-xl
                   ${direction === "left" ? "left-3 md:left-4 lg:left-6" : "right-3 md:right-4 lg:right-6"}
                   ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
  >
    <svg
      className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white group-hover:text-red-200 transition-colors duration-200
                       ${direction === "left" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M9 5l7 7-7 7"
      />
    </svg>
  </button>
);

// Pill-shaped Indicator Dots Component
const CarouselIndicators = ({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-1.5 md:bottom-6 lg:bottom-8">
    {Array.from({ length: total }).map((_, index) => (
      <button
        key={index}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(index);
        }}
        className={`h-2 rounded-full transition-all duration-300 md:h-2.5 lg:h-3
                           ${
                             current === index
                               ? "bg-white w-6 md:w-8 lg:w-10 shadow-lg"
                               : "bg-white/50 w-2 md:w-2.5 lg:w-3 hover:bg-white/70 hover:w-4 md:hover:w-5 lg:hover:w-6"
                           }`}
      />
    ))}
  </div>
);

export function FeaturedProducts() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { data: featuredProducts = [], isLoading, error } = api.products.getFeatured.useQuery({
    limit: 6
  });

  // Convert database products to carousel format
  const carouselProducts = featuredProducts.slice(0, 3).map((product) => ({
    id: product.id,
    imageSrc: product.thumbnailImage,
    altText: product.name,
    category: product.brand?.toUpperCase() || 'FEATURED',
    offer: product.onSale && product.savingsPercent ? `${product.savingsPercent}% OFF` : null,
    title: product.name.toUpperCase(),
    caption: product.description?.substring(0, 50) + '...' || '',
    ctaText: 'SHOP NOW',
    ctaLink: `/products/${product.slug}`,
    price: product.salePrice ? `$${product.salePrice.toFixed(2)}` : `$${product.regularPrice.toFixed(2)}`,
  }));

  // Convert remaining products to small cards format
  const smallProducts = featuredProducts.slice(3).map((product) => ({
    id: product.id,
    isLarge: false,
    imageSrc: product.thumbnailImage,
    altText: product.name,
    category: product.brand?.toUpperCase() || 'FEATURED',
    offer: product.onSale && product.savingsPercent ? `${product.savingsPercent}% OFF` : null,
    title: product.name.toUpperCase(),
    caption: null,
    ctaText: 'SHOP NOW',
    ctaLink: `/products/${product.slug}`,
    badgeText: product.newProduct ? 'NEW' : (product.onSale ? 'SALE' : null),
    price: product.salePrice ? `$${product.salePrice.toFixed(2)}` : `$${product.regularPrice.toFixed(2)}`,
  }));

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 p-0 md:p-0">
        <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-md bg-gray-200 animate-pulse aspect-square"></div>
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-md bg-gray-200 animate-pulse aspect-square"></div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Failed to load featured products:', error);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 p-0 md:p-0">
        <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-md bg-gray-100 aspect-square flex items-center justify-center">
          <p className="text-gray-500">Failed to load featured products</p>
        </div>
      </div>
    );
  }

  // Use dynamic data or fallback to original if no data
  const displayCarouselData = carouselProducts.length > 0 ? carouselProducts : carouselData;
  const displaySmallCardsData = smallProducts.length > 0 ? smallProducts : smallCardsData;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % displayCarouselData.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + displayCarouselData.length) % displayCarouselData.length,
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 p-0 md:p-0">
      {/* --- Carousel Feature Card --- */}
      <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-md">
        {/* Carousel Container */}
        <div className="relative w-full aspect-square overflow-hidden bg-gray-800">
          {/* Slides Container */}
          <div
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {displayCarouselData.map((card) => (
              <Link
                key={card.id}
                href={card.ctaLink}
                className="relative w-full h-full flex-shrink-0 group block"
              >
                {/* Background Image */}
                <Image
                  src={card.imageSrc}
                  alt={card.altText}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover filter brightness-100 contrast-100 group-hover:brightness-75 group-hover:contrast-110 group-hover:scale-105 transition-all duration-300 ease-in-out"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent"></div>
                {/* Text Content */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start text-left text-white z-10 md:p-6 lg:p-8">
                  {card.offer && (
                    <h2 className="text-2xl font-bold text-red-600 md:text-4xl lg:text-5xl">
                      {card.offer}
                    </h2>
                  )}
                  {card.title && (
                    <h3 className="text-lg font-bold text-white mt-0 md:text-2xl lg:text-3xl md:mt-1">
                      {card.title}
                    </h3>
                  )}
                  {card.caption && (
                    <p className="text-xs text-gray-200 mt-1 mb-0.5 md:text-sm md:mt-2 md:mb-2">
                      {card.caption}
                    </p>
                  )}
                  <StyledShopNow text={card.ctaText} />
                </div>
                {/* Price Tag */}
                <PriceTag price={card.price} />
              </Link>
            ))}
          </div>

          {/* Navigation Arrows */}
          <NavArrow direction="left" onClick={prevSlide} />
          <NavArrow direction="right" onClick={nextSlide} />

          {/* Carousel Indicators */}
          <CarouselIndicators
            total={displayCarouselData.length}
            current={currentSlide}
            onSelect={goToSlide}
          />
        </div>
      </div>

      {/* --- Container for Small Cards --- */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {displaySmallCardsData.map((card) => (
          <Link
            href={card.ctaLink}
            key={card.id}
            className="group block relative rounded-xl md:rounded-2xl overflow-hidden shadow-md
                                   border border-transparent hover:border-red-600 md:border-2
                                   transition-all duration-300 ease-in-out"
          >
            <div className="relative w-full aspect-square overflow-hidden bg-gray-700">
              {/* Background Image */}
              <Image
                src={card.imageSrc}
                alt={card.altText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover filter brightness-100 contrast-100 group-hover:brightness-75 group-hover:contrast-110 group-hover:scale-105 transition-all duration-300 ease-in-out"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              {/* Badge */}
              {card.badgeText && (
                <div className="absolute top-1.5 right-1.5 z-20 md:top-3 md:right-3 lg:top-4 lg:right-4">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-center shadow md:w-14 md:h-14 lg:w-16 lg:h-16 md:shadow-lg">
                    <span className="text-[0.55rem] font-bold text-white uppercase leading-tight md:text-xs">
                      {card.badgeText}
                    </span>
                  </div>
                </div>
              )}
              {/* Text Content */}
              <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col items-start text-left text-white z-10 md:p-4">
                {card.category && (
                  <p className="text-[0.6rem] font-semibold uppercase tracking-wider mb-0 text-gray-300 md:text-xs md:mb-1">
                    {card.category}
                  </p>
                )}
                {card.offer && !card.title && (
                  <h2 className="text-sm font-bold text-red-600 md:text-lg lg:text-xl">
                    {card.offer}
                  </h2>
                )}
                {card.offer && card.title && (
                  <h2 className="text-sm font-bold text-white leading-tight md:text-lg lg:text-xl">
                    <span className="text-red-600">{card.offer}</span>{" "}
                    {card.title}
                  </h2>
                )}
                {!card.offer && card.title && (
                  <h2 className="text-sm font-bold text-white md:text-lg lg:text-xl">
                    {card.title}
                  </h2>
                )}
                <StyledShopNow text={card.ctaText} />
              </div>
              {/* Price Tag */}
              <PriceTag price={card.price} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


