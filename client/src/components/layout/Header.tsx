import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BatteryFull,
  Car,
  ChevronDown,
  Cpu,
  Key,
  MapPin,
  Menu,
  Package,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  User,
  Wrench,
  Phone,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { menuApi } from '../../api/menu';

const phoneNumbers = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 22v-7.16h2.4l.36-2.78h-2.76V9.53c0-.8.22-1.35 1.37-1.35h1.46V5.74c-.25-.03-1.13-.11-2.16-.11-2.14 0-3.6 1.31-3.6 3.72v2.07H8.8v2.78h2.77V22h1.93Z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5ZM17.75 6a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17.75 6Z" />
    </svg>
  );
}

const socialLinks = [
  { label: 'Facebook', href: '#', Icon: FacebookIcon },
  { label: 'Twitter', href: '#', Icon: TwitterIcon },
  { label: 'Instagram', href: '#', Icon: InstagramIcon },
];

type PreparedMenuItem = {
  id: string;
  label: string;
  href: string;
  imageUrl?: string | null;
};

type PreparedMenuSection = {
  id: string;
  name: string;
  icon: string;
  items: PreparedMenuItem[];
  visible: boolean;
};

type PreparedMenuLink = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

const ICON_MAP: Record<string, LucideIcon> = {
  car: Car,
  truck: Truck,
  package: Package,
  wrench: Wrench,
  key: Key,
  shield: Shield,
  cpu: Cpu,
  battery: BatteryFull,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  sparkles: Sparkles,
};

// Default "Browse products" section when no sections are configured
const DEFAULT_MENU_SECTIONS: PreparedMenuSection[] = [
  {
    id: 'browse-products',
    name: 'Browse products',
    icon: 'shopping-bag',
    items: [],
    visible: true,
  },
];

const vehicleYears = ['2024', '2023', '2022', '2021', '2020', '2019'];
const vehicleMakes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Kia'];
const vehicleModels = ['Camry', 'Accord', 'F-150', 'RAV4', 'C-Class', 'Telluride'];

const PromoBanner: React.FC<{ text: string; visible: boolean }> = ({ text, visible }) => {
  if (!visible) return null;
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.getElementById('promo-banner-keyframes')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'promo-banner-keyframes';
    style.textContent = `@keyframes promo-banner-shipping {0% {opacity: 0; transform: translateY(12px);} 5% {opacity: 1; transform: translateY(0);} 70% {opacity: 1; transform: translateY(0);} 74% {opacity: 0; transform: translateY(-12px);} 100% {opacity: 0; transform: translateY(-12px);}} @keyframes promo-banner-limited {0% {opacity: 0; transform: translateY(12px);} 74% {opacity: 0; transform: translateY(12px);} 79% {opacity: 1; transform: translateY(0);} 98% {opacity: 1; transform: translateY(0);} 100% {opacity: 0; transform: translateY(-12px);}} @keyframes slideInFromLeft {from {transform: translateX(-100%);} to {transform: translateX(0);}} @keyframes slideOutToLeft {from {transform: translateX(0);} to {transform: translateX(-100%);}} @keyframes fadeIn {from {opacity: 0;} to {opacity: 1;}} @keyframes fadeOut {from {opacity: 1;} to {opacity: 0;}} @keyframes slideDown {from {opacity: 0; max-height: 0; overflow: hidden;} to {opacity: 1; max-height: 500px;}} @keyframes slideUp {from {opacity: 1; max-height: 500px;} to {opacity: 0; max-height: 0; overflow: hidden;}}`;

    document.head.appendChild(style);
  }, []);

  const chipClass = 'inline-flex items-center whitespace-nowrap rounded-full border border-white/40 px-4  text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]';

  const selectedNumber = useMemo(() => {
    return phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
  }, []);

  const telHref = useMemo(() => selectedNumber.replace(/[^+\d]/g, ''), [selectedNumber]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] text-white shadow-[0_12px_24px_rgba(160,11,11,0.25)]">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/15 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/10 blur-2xl"
      />
      <div className="mx-auto flex max-w-content flex-col items-center justify-center gap-2 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-center sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6 sm:text-[0.75rem]">
        <div className="relative flex h-6 w-full items-center justify-center sm:hidden">
          <span
            className="absolute animate-[promo-banner-shipping_14s_linear_infinite] whitespace-nowrap px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white"
          >
            <span className="tracking-[0.22em] animate-pulse">{text}</span>
          </span>
          <span
            className={`${chipClass} absolute animate-[promo-banner-limited_14s_linear_infinite]`}
          >
            <span className="tracking-[0.28em]">Limited Time Offer</span>
          </span>
        </div>
        <span className={`${chipClass} hidden sm:inline-flex`}>
          <span className="tracking-[0.28em]">Limited Time Offer</span>
        </span>
        <span className="hidden items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] sm:flex sm:text-sm">
          <span className="animate-pulse whitespace-nowrap">{text}</span>
        </span>
        <a
          href={`tel:${telHref}`}
          className={`${chipClass} hidden sm:inline-flex transition hover:border-white/50 hover:text-white`}
        >
          <span className="tracking-[0.28em]">Need Help? {selectedNumber}</span>
        </a>
      </div>
    </div>
  );
};

const MenuCard: React.FC<{ item: PreparedMenuItem }> = ({ item }) => {
  const imageSrc = item.imageUrl || 'https://placehold.co/80x80/eee/ccc?text=Item';
  return (
    <Link
      to={item.href}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-500 hover:shadow-md"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
        <img
          src={imageSrc}
          alt={item.label}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = 'https://placehold.co/80x80/eee/ccc?text=Item';
          }}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800 transition group-hover:text-red-700">
          {item.label}
        </span>
        <span className="text-xs text-slate-500">Shop now</span>
      </div>
    </Link>
  );
};



interface VehicleSearchProps {
  isOpen: boolean;
  onToggle: () => void;
  year: string;
  setYear: (value: string) => void;
  make: string;
  setMake: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
}

const VehicleSearchBar: React.FC<VehicleSearchProps> = ({
  isOpen,
  onToggle,
  year,
  setYear,
  make,
  setMake,
  model,
  setModel,
}) => {
  return (
    <div className="bg-[#1e1817] text-white shadow-lg">
      <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-1 sm:px-6">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:text-red-300"
          aria-expanded={isOpen}
        >
          Search by Vehicle
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-3 pb-3 pt-2 md:grid-cols-[repeat(4,minmax(0,1fr))]">
                <label>
                  <select
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <option value="" disabled>
                      Select year
                    </option>
                    {vehicleYears.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <select
                    value={make}
                    onChange={(event) => setMake(event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <option value="" disabled>
                      Select brand
                    </option>
                    {vehicleMakes.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <select
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <option value="" disabled>
                      Select model
                    </option>
                    {vehicleModels.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="flex h-10 items-center justify-center rounded-lg bg-red-600 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-500"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Find Parts
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const cartCount = useMemo(() => items.reduce((sum, line) => sum + line.quantity, 0), [items]);

  const [menuSections, setMenuSections] = useState<PreparedMenuSection[]>([]);
  const [menuLinks, setMenuLinks] = useState<PreparedMenuLink[]>([]);
  const [promoText, setPromoText] = useState('🚚 Free Shipping Over $200');
  const [promoVisible, setPromoVisible] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    let active = true;
      const loadMenu = async () => {
        setMenuLoading(true);
        try {
          const response = await menuApi.get();
          if (!active) return;
          const remoteSections = response.menu?.sections ?? [];
          const prepared = remoteSections.map((section, sectionIndex) => ({
            id: section.id ?? `section-${sectionIndex}`,
            name: section.name,
            icon: section.icon,
            items: (section.items ?? []).map((item, itemIndex) => {
              const resolvedId =
                item.id ?? `${section.id ?? `section-${sectionIndex}`}-item-${itemIndex}`;
              const label = item.category?.name ?? 'Category';
              const slug = item.category?.slug ?? null;
              const href = item.categoryId
                ? slug
                  ? `/categories/${slug}`
                  : `/categories/${item.categoryId}`
                : item.productId
                ? `/products/${item.productId}`
                : '/products';
              const imageUrl = item.category?.imageUrl ?? item.product?.images?.[0] ?? null;
              return {
                id: resolvedId,
                label,
                href,
                imageUrl,
              };
            }),
            visible: section.visible !== false,
          }));
          const visibleSections = prepared.filter((section) => section.visible);
          const sectionsToUse = visibleSections.length > 0 ? visibleSections : prepared;
          // Use prepared sections if any, otherwise use default "Browse products"
          setMenuSections(sectionsToUse.length > 0 ? sectionsToUse : DEFAULT_MENU_SECTIONS);

          const remoteLinks = response.menu?.links ?? [];
          const preparedLinks = remoteLinks
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((link, index) => ({
              id: link.id ?? `link-${index}`,
              label: link.label,
              href: link.href,
              visible: link.visible !== false,
            }));
          const visibleLinks = preparedLinks.filter((link) => link.visible);
          const linksToUse = visibleLinks.length > 0 ? visibleLinks : preparedLinks;
          // Use prepared links if any, otherwise empty array (no default links)
          setMenuLinks(linksToUse);

          // Load promo settings
          const promo = response.menu?.promo ?? { text: '🚚 Free Shipping Over $200', visible: true };
          setPromoText(promo.text);
          setPromoVisible(promo.visible);
      } catch (error) {
        console.warn('Failed to load navigation menu', error);
        if (active) {
          // On error, use default "Browse products" section
          setMenuSections(DEFAULT_MENU_SECTIONS);
          setMenuLinks([]);
        }
      } finally {
        if (active) {
          setMenuLoading(false);
        }
      }
    };
    void loadMenu();
    return () => {
      active = false;
    };
  }, []);

  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');

  const currentSection = useMemo(
    () => (openMegaMenu ? menuSections.find((section) => section.id === openMegaMenu) ?? null : null),
    [menuSections, openMegaMenu]
  );

  const headerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const vehicleSearchRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchToggleRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = () => {
    setMobileMenuClosing(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 300);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setOpenMegaMenu(null);
        setAccountMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        closeMobileMenu();
      }
      if (vehicleSearchRef.current && !vehicleSearchRef.current.contains(target)) {
        setVehicleSearchOpen(false);
      }
      if (
        mobileSearchOpen &&
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(target) &&
        mobileSearchToggleRef.current &&
        !mobileSearchToggleRef.current.contains(target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(target))
      ) {
        setMobileSearchOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMegaMenu(null);
        closeMobileMenu();
        setMobileSearchOpen(false);
        setAccountMenuOpen(false);
        setVehicleSearchOpen(false);
      }
    };
    if (openMegaMenu || mobileMenuOpen || mobileSearchOpen || accountMenuOpen || vehicleSearchOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleKey);
      };
    }
    return undefined;
  }, [openMegaMenu, mobileMenuOpen, mobileSearchOpen, accountMenuOpen, vehicleSearchOpen]);

  const toggleMegaMenu = (id: string) => {
    setOpenMegaMenu((current) => (current === id ? null : id));
  };

  return (
    <header className="sticky top-0 z-50">
      <PromoBanner text={promoText} visible={promoVisible} />
      <div className="relative border-b border-[#d76c28] bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] text-white shadow-md" ref={headerRef}>
        <div className="flex w-full items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              className="rounded-lg p-2 text-white transition hover:bg-white/10 xl:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-[0.4em]">
              <img
                src="/logo.webp"
                alt="ULK Supply logo"
                className="h-10 xl:h-12"
              />
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
            <div className="flex items-center gap-1 whitespace-nowrap text-base font-medium">
              {menuSections.map((section) => {
                const Icon = ICON_MAP[section.icon] ?? Sparkles;
                const isActive = openMegaMenu === section.id;
                const hasItems = section.items.length > 0;

                // If section has no items, render as a link to /products
                if (!hasItems) {
                  return (
                    <Link
                      key={section.id}
                      to="/products"
                      className={cn(
                        'flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-white/10',
                        menuLoading && 'pointer-events-none opacity-60'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {section.name}
                    </Link>
                  );
                }

                // If section has items, render as a dropdown button
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleMegaMenu(section.id)}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-white/10',
                      menuLoading && 'pointer-events-none opacity-60'
                    )}
                    aria-expanded={isActive}
                  >
                    <Icon className="h-5 w-5" />
                    {section.name}
                    <ChevronDown
                      className={cn('h-5 w-5 transition-transform', isActive && 'rotate-180')}
                    />
                  </button>
                );
              })}
              {menuLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.href}
                  className="rounded-full px-3 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-white flex-shrink-0">
            <div className="hidden xl:flex items-center gap-2">
              <motion.div
                ref={desktopSearchRef}
                initial={false}
                animate={{ width: mobileSearchOpen ? 320 : 40 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {mobileSearchOpen ? (
                    <motion.div
                      key="search-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        placeholder="Search keyword or product..."
                        className="h-10 w-full rounded-xl border border-white/20 bg-white/95 pl-9 pr-9 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        aria-label="Search catalog"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      key="search-icon"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      type="button"
                      className="rounded-full p-2 hover:bg-white/10"
                      onClick={() => setMobileSearchOpen(true)}
                      aria-label="Toggle search"
                      aria-expanded={mobileSearchOpen}
                    >
                      <Search className="h-5 w-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <button
              ref={mobileSearchToggleRef}
              type="button"
              className="rounded-full p-2 transition hover:bg-white/10 xl:hidden"
              onClick={() => setMobileSearchOpen((state) => !state)}
              aria-label="Toggle search"
              aria-expanded={mobileSearchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="relative z-[100]">
              <button
                type="button"
                className="rounded-full p-2 transition hover:bg-white/10"
                onClick={() => setAccountMenuOpen((state) => !state)}
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Account</span>
              </button>
              <div
                className={cn(
                  'absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-lg z-50',
                  accountMenuOpen ? 'block' : 'hidden'
                )}
              >
                {user ? (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in</p>
                    <p className="mb-3 text-sm font-medium text-slate-800">{user.name}</p>
                    <div className="space-y-2">
                      <Link to={user.role === 'client' ? '/account' : '/admin'} className="block rounded-lg px-3 py-2 transition hover:bg-slate-100">
                        {user.role === 'client' ? 'Account dashboard' : 'Admin area'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          void logout();
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-slate-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link to="/login" className="block rounded-lg px-3 py-2 transition hover:bg-slate-100">
                      Sign in
                    </Link>
                    <Link to="/register" className="block rounded-lg px-3 py-2 transition hover:bg-slate-100">
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/cart"
              className="relative rounded-full p-2 transition hover:bg-white/10"
              aria-label="View cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-red-600">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {openMegaMenu && currentSection && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute left-0 right-0 top-full z-40 hidden pb-6 xl:block"
              onMouseLeave={() => setOpenMegaMenu(null)}
            >
              <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                {currentSection.items.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {currentSection.items.map((item) => (
                      <MenuCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No items configured for this section yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {mobileSearchOpen && (
            <motion.div
              ref={mobileSearchRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-white/20 bg-white/15 text-white shadow-inner backdrop-blur xl:hidden"
            >
              <div className="relative px-4 py-3">
                <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search keyword or product..."
                  className="h-10 w-full rounded-xl border border-white/20 bg-white/95 pl-9 pr-9 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  aria-label="Search catalog"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative"
          ref={vehicleSearchRef}
        >
          <div className="absolute left-0 right-0 top-0 z-60">
            <VehicleSearchBar
              isOpen={vehicleSearchOpen}
              onToggle={() => setVehicleSearchOpen((state) => !state)}
              year={vehicleYear}
              setYear={setVehicleYear}
              make={vehicleMake}
              setMake={setVehicleMake}
              model={vehicleModel}
              setModel={setVehicleModel}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm xl:hidden" style={{ animation: mobileMenuClosing ? 'fadeOut 300ms ease-out' : 'fadeIn 300ms ease-out' }}>
          <aside
            ref={mobileMenuRef}
            className="flex h-full w-full max-w-xs flex-col bg-white shadow-2xl"
            style={{ animation: mobileMenuClosing ? 'slideOutToLeft 300ms ease-out' : 'slideInFromLeft 300ms ease-out' }}
          >
            <div className="flex items-center justify-start border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="ULK Supply logo" className="h-14 w-auto" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {menuSections.map((section) => {
                  const Icon = ICON_MAP[section.icon] ?? Sparkles;
                  const isOpen = openMobileCategory === section.id;
                  const hasItems = section.items.length > 0;

                  // If section has no items, render as a direct link
                  if (!hasItems) {
                    return (
                      <Link
                        key={section.id}
                        to="/products"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
                      >
                        <Icon className="h-5 w-5 text-red-600" />
                        {section.name}
                      </Link>
                    );
                  }

                  // If section has items, render as expandable dropdown
                  return (
                    <div key={section.id} className="overflow-hidden rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setOpenMobileCategory(isOpen ? null : section.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-red-600" />
                          {section.name}
                        </span>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 gap-2 px-3 pb-3 pt-2">
                              {section.items.map((item) => {
                                const imageSrc = item.imageUrl || 'https://placehold.co/40x40/eee/ccc?text=Item';
                                return (
                                  <Link
                                    key={item.id}
                                    to={item.href}
                                    onClick={closeMobileMenu}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-500 hover:text-red-600"
                                  >
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-100 bg-white">
                                      <img
                                        src={imageSrc}
                                        alt={item.label}
                                        className="h-full w-full object-cover"
                                        onError={(event) => {
                                          event.currentTarget.src = 'https://placehold.co/40x40/eee/ccc?text=Item';
                                        }}
                                      />
                                    </div>
                                    <span>{item.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <hr className="my-6 border-slate-200" />
              <div className="space-y-3">
                {menuLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={link.href}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-500 hover:text-red-600"
                    onClick={closeMobileMenu}
                  >
                    <Sparkles className="h-5 w-5 text-red-600" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-200 px-4 py-4">
              {/* Social Media Icons */}
              <div className="mb-4 flex justify-center gap-4">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="text-slate-600 transition-transform hover:scale-110 hover:text-red-600"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>

              {/* Phone and Location */}
              <div className="mb-4 space-y-2 text-center text-xs text-slate-600">
                <div className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4 text-red-600" />
                  <span>+1 (407) 449-6740</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span>1508 W Vine St, Kissimmee, FL</span>
                </div>
              </div>

              {/* Location Map Card */}
              <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 bg-black/10">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14051.322168483486!2d-81.418344!3d28.303457!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd851677b224a3%3A0x1d2529c0a54763e4!2sULK%20Supply%20LLC!5e0!3m2!1sen!2sus!4v1748259865220!5m2!1sen!2sus&disableDefaultUI=true&gestureHandling=cooperative&zoomControl=false&mapTypeControl=false&streetViewControl=false&fullscreenControl=false"
                  title="ULK Supply Location"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full opacity-90"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};
