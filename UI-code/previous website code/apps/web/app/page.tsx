// filepath: automotive-salah/apps/web/app/page.tsx
"use client";

import { useState } from "react";

import Image from "next/image";

import Link from "next/link";

// Import components from local components
import { CategoryGrid } from "../components/products/CategoryGrid";
import { FeaturedProducts } from "../components/products/FeaturedProducts";
import { BackInStock } from "../components/products/BackInStock";
import { OnSale } from "../components/products/OnSale";
import { NewProductsSection } from "../components/products/NewProductsSection";
import { ManufacturerLogos } from "../components/marketing/ManufacturerLogos";
import { HeroSlider } from "../components/marketing/HeroSlider";
import { BatteryPromo } from "../components/marketing/BatteryPromo";
import { VehicleSearch } from "../components/layout/VehicleSearch";
import { Footer } from "../components/layout/footer";
import { HeaderMenu } from "../components/layout/HeaderMenu";

// --- Main Page Component ---

export default function Home() {
  // State to coordinate search components

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const [isVehicleSearchOpen, setIsVehicleSearchOpen] = useState(false);

  // Handler for mobile search toggle

  const handleMobileSearchToggle = (isOpen: boolean) => {
    setIsMobileSearchOpen(isOpen);

    // Close vehicle search when mobile search opens

    if (isOpen && isVehicleSearchOpen) {
      setIsVehicleSearchOpen(false);
    }
  };

  // Handler for vehicle search toggle

  const handleVehicleSearchToggle = (isOpen: boolean) => {
    setIsVehicleSearchOpen(isOpen);

    // Close mobile search when vehicle search opens

    if (isOpen && isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
    }
  };

  // --- Render JSX ---

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {" "}
      {/* Added a light background */}
      {/* ======================== Header & Menus ======================== */}
      <HeaderMenu
        isMobileSearchOpen={isMobileSearchOpen}
        isVehicleSearchOpen={isVehicleSearchOpen}
        onMobileSearchToggle={handleMobileSearchToggle}
        onVehicleSearchToggle={handleVehicleSearchToggle}
      />
      {/* ======================== Vehicle Search ======================== */}
      <VehicleSearch
        isMobileSearchOpen={isMobileSearchOpen}
        onToggle={handleVehicleSearchToggle}
      />
      {/* ======================== Main Content Area ======================== */}
      <main className="flex-1">
        {" "}
        {/* flex-1 allows main to grow and push footer down */}
        {/* Hero Slider Section */}
        <HeroSlider />
        {/* Featured Products Section */}
        <section className="w-[88%] mx-auto py-8 md:py-12">
          {/* Assuming FeaturedProducts includes its own title */}

          <FeaturedProducts />
        </section>
        {/* Shop by Category Section */}
        <section className="w-[88%] mx-auto py-8 md:py-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-800">
            Shop by Category
          </h2>

          <CategoryGrid />
        </section>
        {/* New Products Section - Using the imported component */}
        <NewProductsSection />
        {/* Back In Stock Section */}
        <section className="w-[88%] mx-auto py-8 md:py-12">
          {/* Title is now rendered in its file*/}

          {/* The BackInStock component renders buttons and carousel */}

          <BackInStock />
        </section>
        {/* On Sale Section */}
        <section className="w-[88%] mx-auto py-8 md:py-12">
          {/* Title is now rendered in its file*/}

          {/* The OnSale component renders buttons and carousel */}

          <OnSale />
        </section>
        {/* Featured Manufacturers Section */}
        <section className="w-[88%] mx-auto py-8 md:py-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-800">
            Featured Manufacturers
          </h2>

          <ManufacturerLogos />
        </section>
        {/* Battery Promotion Section */}
        <BatteryPromo />
      </main>
      {/* ======================== Footer ======================== */}
      <Footer />
    </div>
  );
}
