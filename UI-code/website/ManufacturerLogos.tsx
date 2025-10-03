// filepath: automotive-salah/packages/ui/components/marketing/ManufacturerLogos.tsx
"use client";

import { useState, useEffect } from "react";

import Image from "next/image";

import Link from "next/link";

import { Button } from "@automotive/ui";

import { ChevronRight } from "lucide-react";

const manufacturers = [
  {
    name: "Lishi",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/lishi-logo.png",

    href: "#",
  },

  {
    name: "JMA",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },

  {
    name: "Keyline",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/keyline-usa-logo.png",

    href: "#",
  },

  {
    name: "Xhorse",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },

  {
    name: "ILCO",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/lishi-logo.png",

    href: "#",
  },

  {
    name: "Advanced Diagnostics",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },

  {
    name: "KEYDIY",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/lishi-logo.png",

    href: "#",
  },

  {
    name: "STRATTEC",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },

  {
    name: "Access Tools",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/lishi-logo.png",

    href: "#",
  },

  {
    name: "OBDSTAR",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },

  {
    name: "AUTEL",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/lishi-logo.png",

    href: "#",
  },

  {
    name: "FOBIKO",

    logo: "https://www.key4.com/thumbnail/crop/175/125/manufacturers-logo/jma-logo.png",

    href: "#",
  },
];

export function ManufacturerLogos() {
  const [hoveredLogo, setHoveredLogo] = useState<number | null>(null);

  const [isPaused, setIsPaused] = useState(false);

  // Triple the manufacturers for seamless infinite scroll

  const tripleManufacturers = [
    ...manufacturers,
    ...manufacturers,
    ...manufacturers,
  ];

  useEffect(() => {
    // Add custom CSS for the infinite scroll animation

    const style = document.createElement("style");

    style.textContent = `







      @keyframes infiniteSlide {







        0% {







          transform: translateX(0);







        }







        100% {







          transform: translateX(-${manufacturers.length * 200}px);







        }







      }







      







      .infinite-slide {







        animation: infiniteSlide 40s linear infinite;







      }







      







      .infinite-slide.paused {







        animation-play-state: paused;







      }







    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Infinite Sliding Container */}

      <div className="relative overflow-hidden bg-gray-50 py-4">
        {/* Gradient Overlays for smooth edges */}

        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10"></div>

        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10"></div>

        {/* Sliding Track */}

        <div
          className={`flex ${isPaused ? "infinite-slide paused" : "infinite-slide"}`}
          style={{
            width: `${tripleManufacturers.length * 200}px`,
          }}
        >
          {tripleManufacturers.map((manufacturer, index) => (
            <Link
              key={`${manufacturer.name}-${Math.floor(index / manufacturers.length)}-${index % manufacturers.length}`}
              href={manufacturer.href}
              className="flex-shrink-0 flex items-center justify-center p-4 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 mx-3 w-44 h-20 hover:scale-105"
              onMouseEnter={() => {
                setHoveredLogo(index);

                setIsPaused(true);
              }}
              onMouseLeave={() => {
                setHoveredLogo(null);

                setIsPaused(false);
              }}
              aria-label={`Link to ${manufacturer.name}`}
            >
              <div className="relative h-12 w-full">
                <Image
                  src={manufacturer.logo || "/placeholder.svg"}
                  alt={`${manufacturer.name} logo`}
                  fill
                  sizes="175px"
                  className={`object-contain transition-all duration-300 ${
                    hoveredLogo === index
                      ? "filter-none scale-110"
                      : "filter grayscale opacity-70"
                  }`}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* View More Button */}

      <div className="flex justify-center">
        <Button className="bg-red-700 hover:bg-red-600 text-white">
          View More
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
