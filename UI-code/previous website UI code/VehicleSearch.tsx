// filepath: automotive-salah/packages/ui/components/layout/VehicleSearch.tsx
"use client";

import { useState, useEffect } from "react";

import { ChevronDown, Search } from "lucide-react";

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@automotive/ui";

interface VehicleSearchProps {
  isMobileSearchOpen?: boolean;

  onToggle?: (isOpen: boolean) => void;
}

export function VehicleSearch({
  isMobileSearchOpen = false,
  onToggle,
}: VehicleSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [isFreeShippingVisible, setIsFreeShippingVisible] = useState(true);

  // Track scroll to detect when free shipping bar is hidden

  useEffect(() => {
    const handleScroll = () => {
      // Check if free shipping bar is visible by looking at scroll position

      // If scrolled more than the free shipping bar height (~32px), it's likely hidden

      const scrollY = window.scrollY || document.documentElement.scrollTop;

      setIsFreeShippingVisible(scrollY < 32);
    };

    // Initial check

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close vehicle search when mobile search opens

  useEffect(() => {
    if (isMobileSearchOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isMobileSearchOpen, isOpen]);

  const handleToggle = () => {
    const newState = !isOpen;

    setIsOpen(newState);

    onToggle?.(newState);
  };

  // Calculate top position based on free shipping bar visibility and mobile search state

  const getTopPosition = () => {
    if (isMobileSearchOpen) {
      // When mobile search is open, position below it

      return isFreeShippingVisible ? "10rem" : "8rem"; // Mobile search (4rem) + Header (4rem) + Free shipping (2rem if visible)
    } else {
      // Normal positioning below header

      return isFreeShippingVisible ? "6rem" : "4rem"; // Header (4rem) + Free shipping (2rem if visible)
    }
  };

  return (
    <div
      className={cn(
        "sticky z-40 bg-[#1e1817] text-white border-b border-gray-700 shadow-lg transition-all duration-300",
      )}
      style={{ top: getTopPosition() }}
    >
      <div className="w-[88%] mx-auto">
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-full py-2 text-sm font-medium transition-all duration-200 relative hover:bg-white/5"
          aria-expanded={isOpen}
          aria-controls="vehicle-search-content"
        >
          <span className="relative z-10 flex items-center">
            Search by Vehicle
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 transition-transform duration-300",
                isOpen && "rotate-180",
              )}
            />
          </span>
        </button>

        <div
          id="vehicle-search-content"
          className={cn(
            "grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-4 overflow-hidden transition-all duration-500 ease-in-out",

            isOpen ? "max-h-[220px] pb-4 md:pb-4" : "max-h-0 pb-0",
          )}
        >
          <Select>
            <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-2 focus:ring-red-500 focus:border-red-500 h-9 md:h-10">
              <SelectValue placeholder="Year" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>

              <SelectItem value="2023">2023</SelectItem>

              <SelectItem value="2022">2022</SelectItem>

              <SelectItem value="2021">2021</SelectItem>

              <SelectItem value="2020">2020</SelectItem>

              <SelectItem value="2019">2019</SelectItem>

              <SelectItem value="2018">2018</SelectItem>

              <SelectItem value="2017">2017</SelectItem>

              <SelectItem value="2016">2016</SelectItem>

              <SelectItem value="2015">2015</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-2 focus:ring-red-500 focus:border-red-500 h-9 md:h-10">
              <SelectValue placeholder="Make" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="toyota">Toyota</SelectItem>

              <SelectItem value="honda">Honda</SelectItem>

              <SelectItem value="ford">Ford</SelectItem>

              <SelectItem value="chevrolet">Chevrolet</SelectItem>

              <SelectItem value="bmw">BMW</SelectItem>

              <SelectItem value="mercedes">Mercedes-Benz</SelectItem>

              <SelectItem value="audi">Audi</SelectItem>

              <SelectItem value="volkswagen">Volkswagen</SelectItem>

              <SelectItem value="nissan">Nissan</SelectItem>

              <SelectItem value="hyundai">Hyundai</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-2 focus:ring-red-500 focus:border-red-500 h-9 md:h-10">
              <SelectValue placeholder="Model" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="camry">Camry</SelectItem>

              <SelectItem value="corolla">Corolla</SelectItem>

              <SelectItem value="rav4">RAV4</SelectItem>

              <SelectItem value="highlander">Highlander</SelectItem>

              <SelectItem value="tacoma">Tacoma</SelectItem>

              <SelectItem value="prius">Prius</SelectItem>

              <SelectItem value="sienna">Sienna</SelectItem>

              <SelectItem value="4runner">4Runner</SelectItem>
            </SelectContent>
          </Select>

          <Button className="bg-red-700 hover:bg-red-600 text-white font-medium transition-colors duration-200 shadow-md hover:shadow-lg h-9 md:h-10">
            <Search className="mr-2 h-4 w-4" />
            Find Parts
          </Button>
        </div>
      </div>
    </div>
  );
}
