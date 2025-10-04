// filepath: automotive-salah/packages/ui/components/layout/HeaderMenu.tsx
import Image from "next/image";

import Link from "next/link";

import {
  Search,
  ShoppingCart,
  Heart,
  User,
  ChevronDown,
  Menu,
  X,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Car,
  Wrench,
  Building2,
  Navigation,
  Package,
  Sparkles,
  Download,
  ShoppingBag,
  Star,
} from "lucide-react";

import { useState, useEffect, useRef } from "react";

import { cn } from "@automotive/ui";

// --- Free Shipping Bar Component ---

const FreeShippingBar = () => (
  <div className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white text-center py-2 relative overflow-hidden">
    <div className="relative z-10">
      <span className="text-sm font-semibold animate-pulse">
        🚚 FREE SHIPPING OVER $200 - Limited Time Offer! 🎉
      </span>
    </div>
  </div>
);

// --- Reusable Menu Item Component ---

const MenuItem = ({
  href,
  imgSrc,
  imgAlt,
  text,
}: {
  href: string;
  imgSrc: string;
  imgAlt: string;
  text: string;
}) => (
  <Link
    href={href}
    className="group flex flex-col items-center text-center p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
  >
    <div className="w-20 h-20 lg:w-24 lg:h-24 mb-2 relative flex items-center justify-center bg-white rounded border border-gray-200 group-hover:border-gray-300 overflow-hidden">
      <Image
        src={imgSrc}
        alt={imgAlt}
        fill
        className="object-contain p-1"
        sizes="(max-width: 1024px) 80px, 96px"
        onError={(e) => {
          const target = e.currentTarget;

          target.src = "https://placehold.co/96x96/eee/ccc?text=Category";

          target.alt = `Error loading ${imgAlt}`;
        }}
      />
    </div>

    <span className="text-xs lg:text-sm font-medium text-gray-700 group-hover:text-red-700 leading-tight">
      {text}
    </span>
  </Link>
);

// --- Desktop Mega Menu Content Components ---

const KeyRemotesMenu = () => (
  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-5">
    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
      imgAlt="Car Remotes"
      text="Car Remotes"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/xhorse.png?v=2"
      imgAlt="Xhorse Remotes"
      text="Xhorse Remotes"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/keydiy.png?v=2"
      imgAlt="CGDI Remotes"
      text="CGDI Remotes"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/autel.png?v=2"
      imgAlt="Autel Remotes"
      text="Autel Remotes"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
      imgAlt="Remote Shells"
      text="Remote Shells"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/4f46e5/ffffff?text=Key+Shell"
      imgAlt="Key Shell"
      text="Key Shell"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/dc2626/ffffff?text=Transponder"
      imgAlt="Transponder Keys"
      text="Transponder Keys"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/059669/ffffff?text=Emergency"
      imgAlt="Emergency Keys"
      text="Emergency Keys"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/7c3aed/ffffff?text=Flip+Blade"
      imgAlt="Remote Key Blades"
      text="Remote Key Blades"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/ea580c/ffffff?text=Universal"
      imgAlt="Universal Key Blades"
      text="Universal Key Blades"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/0891b2/ffffff?text=Chips"
      imgAlt="Transponder Chips"
      text="Transponder Chips"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/be185d/ffffff?text=Remote+Covers"
      imgAlt="Remote Covers"
      text="Remote Covers"
    />
  </div>
);

const ManufacturesMenu = () => (
  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-5">
    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/xhorse.png?v=2"
      imgAlt="Xhorse"
      text="Xhorse"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/keyline.png?v=2"
      imgAlt="Keyline"
      text="Keyline"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/autel.png?v=2"
      imgAlt="Autel"
      text="Autel"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/jma.png?v=2"
      imgAlt="JMA"
      text="JMA"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/ilco.png?v=2"
      imgAlt="Ilco"
      text="Ilco"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/lishi.png?v=2"
      imgAlt="Lishi"
      text="Lishi"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/keydiy.png?v=2"
      imgAlt="Keydiy"
      text="Keydiy"
    />

    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/advanced_diagnostics.png?v=2"
      imgAlt="Advanced Diagnostics"
      text="Adv. Diagnostics"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/1f2937/ffffff?text=OBDStar"
      imgAlt="OBDStar"
      text="OBDStar"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/374151/ffffff?text=HPC"
      imgAlt="HPC"
      text="HPC"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/6b7280/ffffff?text=Silca"
      imgAlt="Silca"
      text="Silca"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/9ca3af/ffffff?text=Futura"
      imgAlt="Futura"
      text="Futura"
    />
  </div>
);

const DevicesProgrammersMenu = () => (
  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-5">
    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/dc2626/ffffff?text=Key+Machines"
      imgAlt="Key Cutting Machines"
      text="Key Cutting Machines"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/059669/ffffff?text=Programmers"
      imgAlt="Key Programming Tools"
      text="Key Programming"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/7c3aed/ffffff?text=Diagnostics"
      imgAlt="Diagnostic Tools"
      text="Diagnostic Tools"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/ea580c/ffffff?text=Tuning"
      imgAlt="Tuning Tools"
      text="Tuning Tools"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/0891b2/ffffff?text=TPMS"
      imgAlt="TPMS Sensors"
      text="TPMS Sensors"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/be185d/ffffff?text=Reader"
      imgAlt="Key Blank Reader"
      text="Key Blank Reader"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/4f46e5/ffffff?text=Software"
      imgAlt="Software"
      text="Software"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/059669/ffffff?text=Tokens"
      imgAlt="Tokens"
      text="Tokens"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/dc2626/ffffff?text=Unlocking"
      imgAlt="Unlocking Services"
      text="Unlocking Services"
    />
  </div>
);

const AccessoriesToolsMenu = () => (
  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-5">
    <MenuItem
      href="#"
      imgSrc="https://www.key4.com/assets/images/brands/lishi.png?v=2"
      imgAlt="Lishi Tools"
      text="Lishi Tools"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/dc2626/ffffff?text=Tools"
      imgAlt="Tools"
      text="Tools"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/059669/ffffff?text=Emulator"
      imgAlt="Emulator"
      text="Emulator"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/7c3aed/ffffff?text=Cables"
      imgAlt="Cables"
      text="Cables"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/ea580c/ffffff?text=Adapters"
      imgAlt="Adapters"
      text="Adapters"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/0891b2/ffffff?text=Cutters"
      imgAlt="Cutters"
      text="Cutters"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/be185d/ffffff?text=Batteries"
      imgAlt="Batteries"
      text="Batteries"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/4f46e5/ffffff?text=Accessories"
      imgAlt="Accessories"
      text="Accessories"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/059669/ffffff?text=Soldering"
      imgAlt="Soldering Tools"
      text="Soldering Tools"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/dc2626/ffffff?text=EEPROM"
      imgAlt="Component Eeprom"
      text="Component Eeprom"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/7c3aed/ffffff?text=Car+Opening"
      imgAlt="Car Opening"
      text="Car Opening"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/ea580c/ffffff?text=Immobilizer"
      imgAlt="Inmobilizer"
      text="Inmobilizer"
    />

    <MenuItem
      href="#"
      imgSrc="https://placehold.co/96x96/ea580c/ffffff?text=Immobilizer"
      imgAlt="Lock & Parts"
      text="Lock & Parts"
    />
  </div>
);

// --- Desktop Search Component with Suggestions ---

const DesktopSearch = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md lg:max-w-lg">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

      <input
        type="search"
        placeholder="Search keyword or product..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => setIsSearchFocused(true)}
        className="h-9 w-full rounded-lg bg-white pl-9 pr-3 py-1.5 text-sm border-gray-300 focus:border-red-500 focus:ring-red-500 focus:outline-none"
      />

      {isSearchFocused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-800 mb-3">
                Popular Searches:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {["Xhorse", "Autel", "Key Machine", "Remote", "TPMS"].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchValue(term);

                        setIsSearchFocused(false);
                      }}
                      className="px-3 py-2 bg-gray-50 rounded-lg text-left text-xs hover:bg-red-50 hover:text-red-700 transition-colors border border-gray-200"
                    >
                      {term}
                    </button>
                  ),
                )}
              </div>
            </div>

            {searchValue && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  Search for "{searchValue}"
                </p>

                <button
                  onClick={() => {
                    setIsSearchFocused(false);
                  }}
                  className="w-full px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors"
                >
                  Search Products
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Header and Menu Component ---

interface HeaderMenuProps {
  isMobileSearchOpen?: boolean;

  isVehicleSearchOpen?: boolean;

  onMobileSearchToggle?: (isOpen: boolean) => void;

  onVehicleSearchToggle?: (isOpen: boolean) => void;
}

export function HeaderMenu({
  isMobileSearchOpen: propMobileSearchOpen = false,

  isVehicleSearchOpen = false,

  onMobileSearchToggle,

  onVehicleSearchToggle,
}: HeaderMenuProps = {}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const getAdminBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_ADMIN_URL) return process.env.NEXT_PUBLIC_ADMIN_URL as string;
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:3001`;
    }
    return '';
  };

  const adminLoginHref = `${getAdminBaseUrl()}/login`;
  const adminSignupHref = `${getAdminBaseUrl()}/login?tab=signup`;

  const [internalMobileSearchOpen, setInternalMobileSearchOpen] =
    useState(false);

  const [isFreeShippingVisible, setIsFreeShippingVisible] = useState(true);

  const isMobileSearchOpen = propMobileSearchOpen || internalMobileSearchOpen;

  const headerRef = useRef<HTMLElement>(null);

  const freeShippingRef = useRef<HTMLDivElement>(null);

  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll to detect when free shipping bar is hidden

  useEffect(() => {
    const handleScroll = () => {
      if (freeShippingRef.current) {
        const rect = freeShippingRef.current.getBoundingClientRect();

        // Free shipping bar is visible if its bottom edge is above or at the top of viewport

        setIsFreeShippingVisible(rect.bottom > 0);
      }
    };

    // Initial check

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = (menuName: string) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  const closeMenu = () => {
    setOpenMenu(null);
  };

  const toggleMobileMenu = () => {
    const opening = !isMobileMenuOpen;

    setIsMobileMenuOpen(opening);

    if (opening) {
      closeMenu();
    }
  };

  const toggleMobileSearch = (event: React.MouseEvent) => {
    if (event) event.preventDefault();

    const scrollPosition =
      window.pageYOffset || document.documentElement.scrollTop;

    const shouldOpen = !isMobileSearchOpen;

    if (onMobileSearchToggle) {
      onMobileSearchToggle(shouldOpen);
    } else {
      setInternalMobileSearchOpen(shouldOpen);
    }

    setIsMobileMenuOpen(false);

    closeMenu();

    window.setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 0);

    if (shouldOpen) {
      setTimeout(() => {
        mobileSearchRef.current?.focus();
      }, 50);
    }
  };

  const toggleMobileSubmenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;

    const submenu = button.nextElementSibling as HTMLElement | null;

    const chevronIcon = button.querySelector(".chevron-icon");

    if (!submenu || !chevronIcon) return;

    const isHidden = submenu.classList.contains("hidden");

    const collapseSubmenu = (sub: HTMLElement, chevron: Element) => {
      sub.style.maxHeight = "0";

      chevron.classList.remove("rotate-180");

      sub.setAttribute("aria-expanded", "false");

      setTimeout(() => {
        if (sub.style.maxHeight === "0px") {
          sub.classList.add("hidden");
        }
      }, 300);
    };

    const parent = button.closest(".mobile-menu-items");

    if (parent) {
      const allButtons = parent.querySelectorAll<HTMLButtonElement>(
        ":scope > div > button",
      );

      allButtons.forEach((otherButton) => {
        if (otherButton !== button) {
          const otherSubmenu =
            otherButton.nextElementSibling as HTMLElement | null;

          const otherChevron = otherButton.querySelector(".chevron-icon");

          if (
            otherSubmenu &&
            !otherSubmenu.classList.contains("hidden") &&
            otherChevron
          ) {
            collapseSubmenu(otherSubmenu, otherChevron);
          }
        }
      });
    }

    if (isHidden) {
      submenu.classList.remove("hidden");

      requestAnimationFrame(() => {
        submenu.style.maxHeight = submenu.scrollHeight + "px";
      });

      chevronIcon.classList.add("rotate-180");

      submenu.setAttribute("aria-expanded", "true");
    } else {
      collapseSubmenu(submenu, chevronIcon);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const isOutsideHeader =
        openMenu && headerRef.current && !headerRef.current.contains(target);

      const isOutsideMobileSearch =
        isMobileSearchOpen &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(target) &&
        headerRef.current &&
        !headerRef.current.contains(target);

      if (isOutsideHeader) {
        closeMenu();
      }

      if (isOutsideMobileSearch) {
        if (onMobileSearchToggle) {
          onMobileSearchToggle(false);
        } else {
          setInternalMobileSearchOpen(false);
        }
      }
    };

    if (openMenu || isMobileSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu, isMobileSearchOpen, onMobileSearchToggle]);

  // Calculate mobile search top position based on free shipping bar visibility

  const getMobileSearchTop = () => {
    if (isFreeShippingVisible) {
      return "6rem"; // Free shipping (2rem) + Header (4rem) = 6rem
    } else {
      return "4rem"; // Just Header (4rem)
    }
  };

  return (
    <>
      <div ref={freeShippingRef}>
        <FreeShippingBar />
      </div>

      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-[#f6b210] to-[#a00b0b] shadow-sm"
      >
        <div className="w-[88%] mx-auto flex h-16 items-center justify-between relative gap-x-4 sm:gap-x-6">
          <div className="flex flex-shrink-0 items-center">
            <button
              className="mr-2 sm:mr-4 p-1 sm:p-2 text-white 2xl:hidden"
              aria-label="Open menu"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="https://i.postimg.cc/nVjjhfsz/qt-q-95.png"
                alt="KEY4 Logo"
                width={100}
                height={42}
                className="h-12 w-auto filter drop-shadow-[1px_1px_1px_rgba(0,0,0,0.4)]"
                priority
              />
            </Link>
          </div>

          <div className="hidden 2xl:flex flex-grow items-center justify-center gap-x-6 lg:gap-x-8">
            <nav className="flex items-center space-x-3 lg:space-x-4 text-sm font-medium">
              <button
                onClick={() => toggleMenu("keyremotes")}
                className="flex items-center text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
                aria-expanded={openMenu === "keyremotes"}
              >
                Key & Remotes
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${openMenu === "keyremotes" ? "rotate-180" : ""}`}
                />
              </button>

              <button
                onClick={() => toggleMenu("manufactures")}
                className="flex items-center text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
                aria-expanded={openMenu === "manufactures"}
              >
                Manufactures
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${openMenu === "manufactures" ? "rotate-180" : ""}`}
                />
              </button>

              <button
                onClick={() => toggleMenu("devices")}
                className="flex items-center text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
                aria-expanded={openMenu === "devices"}
              >
                Devices & Programmers
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${openMenu === "devices" ? "rotate-180" : ""}`}
                />
              </button>

              <button
                onClick={() => toggleMenu("accessories")}
                className="flex items-center text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
                aria-expanded={openMenu === "accessories"}
              >
                Accessories & Tools
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${openMenu === "accessories" ? "rotate-180" : ""}`}
                />
              </button>

              <Link
                href="/on-sale"
                className="text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
              >
                On Sale
              </Link>

              <Link
                href="/new-arrival"
                className="text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
              >
                New Arrival
              </Link>

              <Link
                href="/downloads"
                className="text-white hover:text-gray-200 transition-colors py-2 whitespace-nowrap"
              >
                Downloads
              </Link>
            </nav>

            <DesktopSearch />
          </div>

          <div className="flex flex-shrink-0 items-center">
            <nav className="flex items-center space-x-2 sm:space-x-3 2xl:hidden">
              <button
                className="p-1 sm:p-2 text-white hover:text-gray-200"
                aria-label="Search"
                onClick={toggleMobileSearch}
                aria-expanded={isMobileSearchOpen}
              >
                <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div className="relative">
                <button
                  className="p-1 sm:p-2 text-white hover:text-gray-200"
                  aria-haspopup="true"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen(v => !v)}
                >
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <div className={`${isAccountMenuOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-40 bg-white text-gray-700 rounded-md shadow-lg z-50 border border-gray-200`}
                  onMouseLeave={() => setIsAccountMenuOpen(false)}>
                  <Link href={adminLoginHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminLoginHref; setIsAccountMenuOpen(false);}}>Login</Link>
                  <Link href={adminSignupHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminSignupHref; setIsAccountMenuOpen(false);}}>Sign Up</Link>
                </div>
              </div>

              <Link
                href="/wishlist"
                className="p-1 sm:p-2 text-white hover:text-gray-200"
              >
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>

              <Link
                href="/cart"
                className="relative p-1 sm:p-2 text-white hover:text-gray-200"
              >
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />

                <span className="absolute right-0 -top-0.5 sm:-right-1 sm:-top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-700">
                  0
                </span>
              </Link>
            </nav>

            <nav className="hidden 2xl:flex items-center space-x-3">
              <Link
                href="/wishlist"
                className="p-1 text-white hover:text-gray-200"
              >
                <Heart className="h-5 w-5" />
              </Link>

              <div className="relative">
                <button
                  className="p-1 text-white hover:text-gray-200"
                  aria-haspopup="true"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen(v => !v)}
                >
                  <User className="h-5 w-5" />
                </button>
                <div className={`${isAccountMenuOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-40 bg-white text-gray-700 rounded-md shadow-lg z-50 border border-gray-200`}
                  onMouseLeave={() => setIsAccountMenuOpen(false)}>
                  <Link href={adminLoginHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminLoginHref; setIsAccountMenuOpen(false);}}>Login</Link>
                  <Link href={adminSignupHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminSignupHref; setIsAccountMenuOpen(false);}}>Sign Up</Link>
                </div>
              </div>

              <Link
                href="/cart"
                className="relative p-1 text-white hover:text-gray-200"
              >
                <ShoppingCart className="h-5 w-5" />

                <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-700">
                  0
                </span>
              </Link>
            </nav>
          </div>

          <div
            className={cn(
              "absolute left-1/2 top-full mt-0 w-[98%] -translate-x-1/2",

              "rounded-b-lg bg-white p-6 shadow-xl",

              "transition-all duration-300 ease-out z-[49]",

              openMenu &&
                [
                  "keyremotes",
                  "manufactures",
                  "devices",
                  "accessories",
                ].includes(openMenu)
                ? "opacity-100 visible translate-y-0"
                : "opacity-0 invisible -translate-y-4 pointer-events-none",
            )}
            aria-hidden={!openMenu}
          >
            {openMenu === "keyremotes" && <KeyRemotesMenu />}

            {openMenu === "manufactures" && <ManufacturesMenu />}

            {openMenu === "devices" && <DevicesProgrammersMenu />}

            {openMenu === "accessories" && <AccessoriesToolsMenu />}
          </div>
        </div>
      </header>

      {/* Mobile Search Container with Scroll-Aware Positioning */}

      <div
        ref={mobileSearchContainerRef}
        className={cn(
          "fixed left-0 right-0 z-40 2xl:hidden",

          "bg-gray-100 border-b border-gray-300 shadow-md",

          "transition-all duration-300 ease-out",

          isMobileSearchOpen
            ? "opacity-100 transform translate-y-0"
            : "opacity-0 transform -translate-y-full pointer-events-none",
        )}
        aria-hidden={!isMobileSearchOpen}
        style={{
          top: isMobileSearchOpen ? getMobileSearchTop() : "-100%",
        }}
      >
        <div className="relative w-[88%] mx-auto p-3">
          <input
            ref={mobileSearchRef}
            type="search"
            placeholder="Search products..."
            className="w-full rounded-lg border-gray-300 bg-white pl-4 pr-10 h-10 text-sm focus:border-red-500 focus:ring-red-500"
          />

          <Search className="absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div
        className={cn(
          "2xl:hidden fixed inset-0 bg-black bg-opacity-60 z-[60]",

          "transition-opacity duration-300",

          isMobileMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none",
        )}
        onClick={toggleMobileMenu}
        aria-hidden={!isMobileMenuOpen}
      />

      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-[70] bg-white h-full w-4/5 max-w-sm 2xl:hidden",

          "overflow-y-auto shadow-lg",

          "transform transition-transform duration-300 ease-out",

          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",

          "flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
        aria-hidden={!isMobileMenuOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        <div className="p-4 border-b sticky top-0 bg-white z-10 h-[10%] min-h-[60px] flex items-center">
          <div className="flex justify-between items-center w-full">
            <span id="mobile-menu-title" className="sr-only">
              Mobile Navigation Menu
            </span>

            <Image
              src="https://i.postimg.cc/nVjjhfsz/qt-q-95.png"
              alt="KEY4 Logo"
              width={120}
              height={42}
              className="h-12 w-auto filter drop-shadow-[1px_1px_1px_rgba(0,0,0,0.4)]"
            />

            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  className="p-1 text-gray-600 hover:text-red-600"
                  aria-label="Account"
                  aria-haspopup="true"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen(v => !v)}
                >
                  <User className="h-5 w-5" />
                </button>
                <div className={`${isAccountMenuOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-40 bg-white text-gray-700 rounded-md shadow-lg z-50 border border-gray-200`}
                  onMouseLeave={() => setIsAccountMenuOpen(false)}>
                  <Link href={adminLoginHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminLoginHref; setIsAccountMenuOpen(false);}}>Login</Link>
                  <Link href={adminSignupHref} className="block px-4 py-2 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); if (typeof window !== 'undefined') window.location.href = adminSignupHref; setIsAccountMenuOpen(false);}}>Sign Up</Link>
                </div>
              </div>

              <Link
                href="/cart"
                className="p-1 text-gray-600 hover:text-red-600"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="h-5 w-5" />
              </Link>

              <button
                className="p-1 text-gray-500 hover:text-gray-800"
                onClick={toggleMobileMenu}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto h-[70%]">
          <nav
            className="space-y-1 mobile-menu-items"
            aria-label="Mobile menu categories"
          >
            <div>
              <button
                onClick={toggleMobileSubmenu}
                className="flex items-center justify-between w-full py-2.5 text-left font-medium text-gray-700 hover:text-black"
                aria-expanded="false"
              >
                <span className="flex items-center">
                  <Car
                    className="h-5 w-5 mr-3 text-red-600"
                    aria-hidden="true"
                  />
                  Key & Remotes
                </span>

                <ChevronDown
                  className="chevron-icon h-4 w-4 transition-transform duration-200"
                  aria-hidden="true"
                />
              </button>

              <div
                className="pl-4 space-y-1 hidden overflow-hidden transition-all duration-300 ease-out max-h-0"
                aria-expanded="false"
              >
                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Car Remotes
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Xhorse Remotes
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  CGDI Remotes
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Autel Remotes
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Remote Shells
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Key Shell
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Transponder Keys
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Emergency Keys
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Remote Key Blades
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Universal Key Blades
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Transponder Chips
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Remote Covers
                </Link>
              </div>
            </div>

            <div>
              <button
                onClick={toggleMobileSubmenu}
                className="flex items-center justify-between w-full py-2.5 text-left font-medium text-gray-700 hover:text-black"
                aria-expanded="false"
              >
                <span className="flex items-center">
                  <Building2
                    className="h-5 w-5 mr-3 text-red-600"
                    aria-hidden="true"
                  />
                  Manufactures
                </span>

                <ChevronDown
                  className="chevron-icon h-4 w-4 transition-transform duration-200"
                  aria-hidden="true"
                />
              </button>

              <div
                className="pl-4 space-y-1 hidden overflow-hidden transition-all duration-300 ease-out max-h-0"
                aria-expanded="false"
              >
                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Xhorse
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Keyline
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Autel
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  JMA
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Ilco
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Lishi
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Keydiy
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Adv. Diagnostics
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  OBDStar
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  HPC
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Silca
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Futura
                </Link>
              </div>
            </div>

            <div>
              <button
                onClick={toggleMobileSubmenu}
                className="flex items-center justify-between w-full py-2.5 text-left font-medium text-gray-700 hover:text-black"
                aria-expanded="false"
              >
                <span className="flex items-center">
                  <Wrench
                    className="h-5 w-5 mr-3 text-red-600"
                    aria-hidden="true"
                  />
                  Devices & Programmers
                </span>

                <ChevronDown
                  className="chevron-icon h-4 w-4 transition-transform duration-200"
                  aria-hidden="true"
                />
              </button>

              <div
                className="pl-4 space-y-1 hidden overflow-hidden transition-all duration-300 ease-out max-h-0"
                aria-expanded="false"
              >
                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Key Cutting Machines
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Key Programming
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Diagnostic Tools
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Tuning Tools
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  TPMS Sensors
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Key Blank Reader
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Software
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Tokens
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Unlocking Services
                </Link>
              </div>
            </div>

            <div>
              <button
                onClick={toggleMobileSubmenu}
                className="flex items-center justify-between w-full py-2.5 text-left font-medium text-gray-700 hover:text-black"
                aria-expanded="false"
              >
                <span className="flex items-center">
                  <Package
                    className="h-5 w-5 mr-3 text-red-600"
                    aria-hidden="true"
                  />
                  Accessories & Tools
                </span>

                <ChevronDown
                  className="chevron-icon h-4 w-4 transition-transform duration-200"
                  aria-hidden="true"
                />
              </button>

              <div
                className="pl-4 space-y-1 hidden overflow-hidden transition-all duration-300 ease-out max-h-0"
                aria-expanded="false"
              >
                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Lishi Tools
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Tools
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Emulator
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Cables
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Adapters
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Cutters
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Batteries
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Accessories
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Soldering Tools
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/logo-key-shel-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Component Eeprom
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/car-remote-mini.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Car Opening
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Inmobilizer
                </Link>

                <Link
                  href="#"
                  className="flex items-center py-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Image
                    src="https://www.key4.com/thumbnail/crop/40/40/categories-icons/autel-remotes-cat-small.png"
                    alt=""
                    width={20}
                    height={20}
                    className="mr-3"
                    aria-hidden="true"
                  />
                  Lock & Parts
                </Link>
              </div>
            </div>

            <hr className="my-4 border-gray-200" />

            <Link
              href="/on-sale"
              className="flex items-center py-2.5 font-medium text-gray-700 hover:text-black"
              onClick={toggleMobileMenu}
            >
              <ShoppingBag
                className="h-5 w-5 mr-3 text-red-600"
                aria-hidden="true"
              />
              On Sale
            </Link>

            <Link
              href="/new-arrival"
              className="flex items-center py-2.5 font-medium text-gray-700 hover:text-black"
              onClick={toggleMobileMenu}
            >
              <Sparkles
                className="h-5 w-5 mr-3 text-red-600"
                aria-hidden="true"
              />
              New Arrival
            </Link>

            <Link
              href="/downloads"
              className="flex items-center py-2.5 font-medium text-gray-700 hover:text-black"
              onClick={toggleMobileMenu}
            >
              <Download
                className="h-5 w-5 mr-3 text-red-600"
                aria-hidden="true"
              />
              Downloads
            </Link>
          </nav>
        </div>

        <div className="border-t bg-gray-50 p-4 h-[20%] min-h-[140px]">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <Link
              href="#"
              className="text-gray-600 hover:text-red-600"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </Link>

            <Link
              href="#"
              className="text-gray-600 hover:text-red-600"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </Link>

            <Link
              href="#"
              className="text-gray-600 hover:text-red-600"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </Link>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center text-xs text-gray-600">
              <Phone className="h-3 w-3 mr-1" aria-hidden="true" />

              <span>+1 (555) 123-4567</span>
            </div>

            <div className="flex items-center justify-center text-xs text-gray-600">
              <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />

              <span>123 Main St, City, State</span>
            </div>
          </div>

          <div className="mt-2">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3048.4037!2d-74.0059!3d40.7128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQyJzQ2LjEiTiA3NMKwMDAnMjEuMyJX!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="60"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded"
              title="Store Location"
            />
          </div>
        </div>
      </div>
    </>
  );
}
