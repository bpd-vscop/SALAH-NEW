"use client";

import Image from "next/image";
import Link from "next/link";
import { api } from "../../lib/api";

export function HeroSliderDB() {
  const { data: slides = [], isLoading } = api.public.heroSlides.getActive.useQuery();

  if (isLoading) return null;
  if (!slides.length) return null;

  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative w-full aspect-[3/2] md:aspect-[3/1]">
        {/* Show first slide for now; can be extended to carousel */}
        {slides.slice(0, 1).map((s) => (
          <Link key={s.id} href={s.primaryButtonUrl || "#"} className="block w-full h-full">
            <Image
              src={s.imageUrl}
              alt={s.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-6 left-6 text-white max-w-xl">
              <h2 className="text-2xl md:text-4xl font-bold">{s.title}</h2>
              {s.subtitle && <p className="mt-2 text-sm md:text-base opacity-90">{s.subtitle}</p>}
              {s.primaryButtonText && (
                <span className="inline-block mt-3 bg-white text-black px-4 py-2 rounded-md text-sm font-medium">
                  {s.primaryButtonText}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}



