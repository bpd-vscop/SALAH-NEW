// filepath: automotive-salah/packages/ui/components/marketing/HeroSlider.tsx
"use client";

import { useState, useEffect } from "react";

import Image from "next/image";

import Link from "next/link"; // Import Next.js Link for client-side navigation

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@automotive/ui";

// --- Updated slides data structure with href ---

const slides = [
  {
    id: 1,

    imageDesktop:
      "https://www.key4.com/uploads/files/headers/3-2025/bmw-g-chasis-desk.jpg",

    imageMobile:
      "https://www.key4.com/uploads/files/headers/6-2024/JMA-Nomad-Go-mob.jpg",

    alt: "Experience the Fastest AutoProPAD, Ever.",

    href: "/products/autopad", // Example URL - Replace with actual link
  },

  {
    id: 2,

    imageDesktop:
      "https://www.key4.com/uploads/files/headers/3-2025/bmw-g-chasis-desk.jpg",

    imageMobile:
      "https://www.key4.com/uploads/files/headers/6-2024/Lonsdor-LT20-Universal-Smart-Key-1-mob.jpg",

    alt: "BMW G Chassis Programming",

    href: "/solutions/bmw-g-chassis", // Example URL - Replace with actual link
  },

  {
    id: 3,

    imageDesktop:
      "https://www.key4.com/uploads/files/headers/20-3-2025/new-xhorse-g2-wired-remotes_(1).jpg",

    imageMobile:
      "https://www.key4.com/uploads/files/headers/6-2024/JMA-Nomad-Go-mob.jpg",

    alt: "New Xhorse G2 Wired Remotes",

    href: "/collections/xhorse-remotes", // Example URL - Replace with actual link
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isHovering, setIsHovering] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);

  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (isHovering || isAnimating) return;

    const interval = setInterval(() => changeSlide(1), 6000);

    return () => clearInterval(interval);
  }, [isHovering, isAnimating]);

  const changeSlide = (dir: number) => {
    if (isAnimating) return;

    setIsAnimating(true);

    setDirection(dir);

    setTimeout(() => {
      setCurrentSlide((prev) => (prev + dir + slides.length) % slides.length);

      setTimeout(() => setIsAnimating(false), 800);
    }, 400);
  };

  const nextSlide = () => changeSlide(1);

  const prevSlide = () => changeSlide(-1);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;

    const dir = index > currentSlide ? 1 : -1;

    setDirection(dir);

    setCurrentSlide(index);
  };

  const getAnimationClasses = () => {
    return cn(
      "object-cover transition-all duration-1000 w-full h-full",

      isAnimating
        ? direction > 0
          ? "scale-110 blur-sm opacity-80"
          : "scale-90 blur-sm opacity-80"
        : "scale-100 blur-0 opacity-100",
    );
  };

  return (
    <div
      className="relative overflow-hidden cursor-pointer" // Add cursor-pointer to the main container
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}

      // No onClick here, it's handled by the Link component per slide
    >
      {/* Slider Track */}

      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          // --- Link wraps the entire slide content ---

          <Link
            key={slide.id}
            href={slide.href || "#"} // Use '#' as fallback if href is missing
            aria-label={`Learn more about ${slide.alt}`} // Accessibility label
            className="relative min-w-full flex-shrink-0 block group" // Make Link behave like a block, add group for potential hover effects later

            // Prevent link navigation when clicking arrows/dots by stopping propagation *if needed*

            // This is generally handled by z-index, but can be added if issues arise.

            // onClick={(e) => e.stopPropagation()} // Usually not necessary with proper z-index
          >
            {/* Image Container with Aspect Ratio */}

            <div className="relative w-full overflow-hidden aspect-[3/2] md:aspect-[3/1]">
              {/* Mobile Image */}

              <Image
                src={
                  slide.imageMobile || slide.imageDesktop || "/placeholder.svg"
                }
                alt={slide.alt}
                fill
                className={cn(getAnimationClasses(), "block md:hidden")}
                priority={index === 0}
                sizes="(max-width: 767px) 100vw, 0vw"
              />

              {/* Desktop Image */}

              <Image
                src={
                  slide.imageDesktop || slide.imageMobile || "/placeholder.svg"
                }
                alt={slide.alt}
                fill
                className={cn(getAnimationClasses(), "hidden md:block")}
                priority={index === 0}
                sizes="(min-width: 768px) 100vw, 0vw"
              />
            </div>

            {/* Faded Glass Bottom Overlay */}

            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1/4",

                "bg-gradient-to-t from-black/20 via-black/5 to-transparent",

                "backdrop-blur-md",

                "[mask-image:linear-gradient(to_top,rgba(0,0,0,1)_25%,transparent_100%)]",

                "[-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,1)_25%,transparent_100%)]",

                "transition-colors duration-300 group-hover:bg-black/10", // Example: slightly darken overlay on hover via group
              )}
              aria-hidden="true" // Hide decorative overlay from screen readers
            />
          </Link> // --- End Link wrapper ---
        ))}
      </div>

      {/* Navigation Arrows - Need higher z-index than the Link */}

      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent link navigation when clicking arrow

          prevSlide();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-20" // Increased z-index to 20
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent link navigation when clicking arrow

          nextSlide();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-20" // Increased z-index to 20
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Indicators - Need higher z-index than the Link */}

      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
        {" "}
        {/* Increased z-index to 20 */}
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation(); // Prevent link navigation when clicking dot

              goToSlide(index);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 ease-in-out",

              currentSlide === index
                ? "bg-white w-6"
                : "bg-white/60 hover:bg-white/90 w-3",
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
