import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BatteryFull,
  Car,
  ChevronDown,
  Link as LinkIcon,
  Cpu,
  Heart,
  Key,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  User,
  Wrench,
  Phone,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { cn } from '../../utils/cn';
import { menuApi } from '../../api/menu';
import { productsApi } from '../../api/products';
import { ordersApi } from '../../api/orders';
import type { Order, Product } from '../../types/api';
import { formatCurrency } from '../../utils/format';

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
  productCount?: number;
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
  key: Key,
  wrench: Wrench,
  battery: BatteryFull,
  gauge: Car, // Using Car as fallback for Gauge
  cpu: Cpu,
  'circuit-board': Cpu, // Using Cpu as fallback for CircuitBoard
  shield: Shield,
  zap: BatteryFull, // Using BatteryFull as fallback for Zap
  settings: Wrench, // Using Wrench as fallback for Settings
  cog: Wrench, // Using Wrench as fallback for Cog
  hammer: Wrench, // Using Wrench as fallback for Hammer
  radio: Cpu, // Using Cpu as fallback for Radio
  package: Package,
  'file-text': Package, // Using Package as fallback for FileText
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

const isSaleActive = (product: Product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }

  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

// Vehicle options will be loaded from the database

const PromoBanner: React.FC<{ text: string; visible: boolean; loading?: boolean }> = ({ text, visible, loading = false }) => {
  // Call all hooks at the top level before any early returns
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

  const selectedNumber = useMemo(() => {
    return phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
  }, []);

  const telHref = useMemo(() => selectedNumber.replace(/[^+\d]/g, ''), [selectedNumber]);

  const chipClass = 'inline-flex items-center whitespace-nowrap rounded-full border border-white/40 px-4  text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]';

  // Show placeholder while loading
  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] text-white shadow-[0_12px_24px_rgba(160,11,11,0.25)] transition-all duration-500 ease-in-out">
        <div className="mx-auto flex max-w-content flex-col items-center justify-center gap-2 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-center sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6 sm:text-[0.75rem]">
          <div className="h-6 w-full sm:w-auto opacity-0" />
        </div>
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="relative overflow-hidden transition-all duration-500 ease-in-out h-0 opacity-0" style={{ maxHeight: 0 }} />
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] text-white shadow-[0_12px_24px_rgba(160,11,11,0.25)] transition-all duration-500 ease-in-out animate-[slideDown_0.5s_ease-out]">
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
  const productCount = item.productCount ?? 0;
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
        <span className="text-xs text-slate-500">{productCount} {productCount === 1 ? 'product' : 'products'}</span>
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
  onFindParts: () => void;
  vehicleMakes: string[];
  vehicleModels: string[];
  loading?: boolean;
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
  onFindParts,
  vehicleMakes,
  vehicleModels,
  loading = false,
}) => {
  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    // Reset dependent fields when make changes
    setModel('');
    setYear('');
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    // Reset year when model changes
    setYear('');
  };

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
                    value={make}
                    onChange={(event) => handleMakeChange(event.target.value)}
                    disabled={loading || vehicleMakes.length === 0}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      {loading ? 'Loading...' : vehicleMakes.length === 0 ? 'No brands available' : 'Select brand'}
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
                    onChange={(event) => handleModelChange(event.target.value)}
                    disabled={loading || !make || vehicleModels.length === 0}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      {loading ? 'Loading...' : !make ? 'Select brand first' : vehicleModels.length === 0 ? 'No models available' : 'Select model'}
                    </option>
                    {vehicleModels.map((option) => (
                      <option key={option} value={option} className="text-slate-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    disabled={loading || !make || !model}
                    className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={loading ? 'Loading...' : !make || !model ? 'Select brand & model first' : 'Enter year'}
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </label>
                <button
                  type="button"
                  onClick={onFindParts}
                  disabled={loading}
                  className="flex h-10 items-center justify-center rounded-lg bg-red-600 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { items, addItem: addCartItem, updateItem: updateCartItem, removeItem: removeCartItem } = useCart();
  const {
    items: wishlistItems,
    updateItem: updateWishlistItem,
    removeItem: removeWishlistItem,
  } = useWishlist();
  const cartCount = useMemo(() => items.reduce((sum, line) => sum + line.quantity, 0), [items]);
  const wishlistCount = useMemo(() => wishlistItems.length, [wishlistItems]);
  const showWishlist = true;
  const [cartProducts, setCartProducts] = useState<Record<string, Product>>({});
  const [wishlistProducts, setWishlistProducts] = useState<Record<string, Product>>({});
  const cartSubtotal = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = cartProducts[line.productId];
      if (!product) return sum;
      const saleActive = isSaleActive(product);
      const price = saleActive ? (product.salePrice as number) : product.price;
      return sum + price * line.quantity;
    }, 0);
  }, [items, cartProducts]);

  const [menuSections, setMenuSections] = useState<PreparedMenuSection[]>([]);
  const [menuLinks, setMenuLinks] = useState<PreparedMenuLink[]>([]);
  const [promoText, setPromoText] = useState('');
  const [promoVisible, setPromoVisible] = useState(false);
  const [promoLoading, setPromoLoading] = useState(true); // Start as loading
  const [menuLoading, setMenuLoading] = useState(false);
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleOptions, setVehicleOptions] = useState<{ makes: string[]; models: string[] }>({
    makes: [],
    models: [],
  });
  const [vehicleOptionsLoading, setVehicleOptionsLoading] = useState(false);

  // Orders state for notification badge
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLastSeenAt, setOrdersLastSeenAt] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = Number(localStorage.getItem('ordersLastSeenAt') || '0');
    return Number.isFinite(stored) ? stored : 0;
  });

  const ordersBadgeCount = useMemo(() => {
    if (!user || user.role !== 'client') return 0;
    const seenAt = ordersLastSeenAt || 0;
    return orders.filter((order) => {
      const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      const isActive = order.status === 'pending' || order.status === 'processing';
      return isActive && created > seenAt;
    }).length;
  }, [orders, ordersLastSeenAt, user]);

  useEffect(() => {
    const updateViewed = (event?: Event) => {
      if (typeof window === 'undefined') return;
      const fromStorage = Number(localStorage.getItem('ordersLastSeenAt') || '0');
      const detailTs =
        event instanceof CustomEvent && event.detail && typeof event.detail.at === 'number'
          ? event.detail.at
          : 0;
      const next = Number.isFinite(detailTs) && detailTs > 0 ? detailTs : fromStorage;
      if (Number.isFinite(next) && next > ordersLastSeenAt) {
        setOrdersLastSeenAt(next);
      }
    };
    window.addEventListener('ordersViewed', updateViewed);
    window.addEventListener('storage', updateViewed);
    window.addEventListener('focus', updateViewed);
    return () => {
      window.removeEventListener('ordersViewed', updateViewed);
      window.removeEventListener('storage', updateViewed);
      window.removeEventListener('focus', updateViewed);
    };
  }, [ordersLastSeenAt]);

  // Load orders for notification badge (initial, on focus, periodic refresh)
  useEffect(() => {
    if (!user || user.role !== 'client') {
      setOrders([]);
      setOrdersLastSeenAt(0);
      return;
    }

    let cancelled = false;
    const loadOrders = async () => {
      try {
        const { orders: ordersList } = await ordersApi.list();
        if (!cancelled) {
          setOrders(ordersList);
        }
      } catch (error) {
        console.warn('Failed to load orders for notification badge', error);
      }
    };

    void loadOrders();

    const onFocus = () => void loadOrders();
    const intervalId = window.setInterval(loadOrders, 60000);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadVehicleOptions = async () => {
      setVehicleOptionsLoading(true);
      try {
        const { makes, models } = await productsApi.getVehicleCompatibilityOptions({
          make: vehicleMake || undefined,
        });
        if (!active) return;
        setVehicleOptions({ makes, models });
      } catch (error) {
        console.warn('Failed to load vehicle compatibility options', error);
        if (active) {
          setVehicleOptions({ makes: [], models: [] });
        }
      } finally {
        if (active) {
          setVehicleOptionsLoading(false);
        }
      }
    };
    void loadVehicleOptions();
    return () => {
      active = false;
    };
  }, [vehicleMake]);

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

          // Load promo settings from API only; no placeholders
          const promo = response.menu?.promo;
          const nextText = (promo?.text || '').trim();
          setPromoText(nextText);
          setPromoVisible(Boolean(promo?.visible && nextText));
          setPromoLoading(false);
      } catch (error) {
        console.warn('Failed to load navigation menu', error);
        if (active) {
          // On error, use default "Browse products" section; hide promo
          setMenuSections(DEFAULT_MENU_SECTIONS);
          setMenuLinks([]);
          setPromoText('');
          setPromoVisible(false);
          setPromoLoading(false);
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
  const [mobileAccountMenuOpen, setMobileAccountMenuOpen] = useState(false);
  const [cartMenuOpen, setCartMenuOpen] = useState(false);
  const [wishlistMenuOpen, setWishlistMenuOpen] = useState(false);
  const [wishlistSelectMode, setWishlistSelectMode] = useState(false);
  const [wishlistSelectedIds, setWishlistSelectedIds] = useState<Set<string>>(new Set());
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentSection = useMemo(
    () => (openMegaMenu ? menuSections.find((section) => section.id === openMegaMenu) ?? null : null),
    [menuSections, openMegaMenu]
  );

  const headerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const cartMenuRef = useRef<HTMLDivElement>(null);
  const wishlistMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);
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
        setCartMenuOpen(false);
        setWishlistMenuOpen(false);
      }
      if (cartMenuOpen && cartMenuRef.current && !cartMenuRef.current.contains(target)) {
        setCartMenuOpen(false);
      }
      if (wishlistMenuOpen && wishlistMenuRef.current && !wishlistMenuRef.current.contains(target)) {
        setWishlistMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        closeMobileMenu();
      }
      if (mobileAccountMenuRef.current && !mobileAccountMenuRef.current.contains(target)) {
        setMobileAccountMenuOpen(false);
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
        setMobileAccountMenuOpen(false);
        setCartMenuOpen(false);
        setWishlistMenuOpen(false);
        setVehicleSearchOpen(false);
      }
    };
    if (
      openMegaMenu ||
      mobileMenuOpen ||
      mobileSearchOpen ||
      accountMenuOpen ||
      mobileAccountMenuOpen ||
      cartMenuOpen ||
      wishlistMenuOpen ||
      vehicleSearchOpen
    ) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleKey);
      };
    }
    return undefined;
  }, [
    openMegaMenu,
    mobileMenuOpen,
    mobileSearchOpen,
    accountMenuOpen,
    mobileAccountMenuOpen,
    cartMenuOpen,
    wishlistMenuOpen,
    vehicleSearchOpen,
  ]);

  const toggleMegaMenu = (id: string) => {
    setOpenMegaMenu((current) => (current === id ? null : id));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    const params = new URLSearchParams(location.pathname === '/products' ? location.search : '');
    params.set('search', query);
    navigate(`/products?${params.toString()}`);
    setMobileSearchOpen(false);
  };

  useEffect(() => {
    const missing = items
      .filter((line) => !cartProducts[line.productId])
      .map((line) => line.productId);
    if (!missing.length) {
      return;
    }

    const loadProducts = async () => {
      const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
      const nextMap: Record<string, Product> = {};
      responses.forEach((result) => {
        if (result.status === 'fulfilled') {
          const product = result.value.product;
          nextMap[product.id] = product;
        }
      });
      setCartProducts((current) => ({ ...current, ...nextMap }));
    };

    void loadProducts();
  }, [items, cartProducts]);

  useEffect(() => {
    const missing = wishlistItems
      .filter((line) => !wishlistProducts[line.productId])
      .map((line) => line.productId);
    if (!missing.length) {
      return;
    }

    const loadProducts = async () => {
      const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
      const nextMap: Record<string, Product> = {};
      responses.forEach((result) => {
        if (result.status === 'fulfilled') {
          const product = result.value.product;
          nextMap[product.id] = product;
        }
      });
      setWishlistProducts((current) => ({ ...current, ...nextMap }));
    };

    void loadProducts();
  }, [wishlistItems, wishlistProducts]);

  useEffect(() => {
    if (!wishlistMenuOpen) {
      setWishlistSelectMode(false);
      setWishlistSelectedIds(new Set());
    }
  }, [wishlistMenuOpen]);

  const toggleWishlistSelected = (productId: string) => {
    setWishlistSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleWishlistProceed = async () => {
    const idsToUse = wishlistSelectMode
      ? Array.from(wishlistSelectedIds)
      : wishlistItems.map((line) => line.productId);
    if (!idsToUse.length) {
      return;
    }

    for (const productId of idsToUse) {
      const line = wishlistItems.find((item) => item.productId === productId);
      if (!line) continue;
      const product = wishlistProducts[productId];
      await addCartItem({ productId, quantity: line.quantity }, product);
    }

    setWishlistMenuOpen(false);
    navigate('/checkout');
  };

  return (
    <header id="main-header" className="fixed top-0 left-0 right-0 z-40 overflow-x-clip">
      <PromoBanner text={promoText} visible={promoVisible} loading={promoLoading} />
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
                    <motion.form
                      key="search-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                      onSubmit={handleSearchSubmit}
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
                    </motion.form>
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
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition',
                  user
                    ? 'overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white shadow-sm hover:ring-2 hover:ring-primary/40'
                    : 'text-white hover:bg-white/10'
                )}
                onClick={() => setAccountMenuOpen((state) => !state)}
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
              >
                {user ? (
                  user.profileImage ? (
                    <img
                      src={
                        user.profileImage.startsWith('http://') || user.profileImage.startsWith('https://')
                          ? user.profileImage
                          : `/uploads/${user.profileImage}`
                      }
                      alt={user?.name || 'Profile'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user.name?.[0]?.toUpperCase() || 'U'}</span>
                  )
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>

              {/* Orders notification badge */}
              {ordersBadgeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white shadow-md ring-2 ring-white">
                  {ordersBadgeCount > 99 ? '99+' : ordersBadgeCount}
                </span>
              )}

              <AnimatePresence>
                {accountMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50"
                  >
                    <div className="p-3">
                      {user ? (
                        <>
                          <div className="mb-3 rounded-lg bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.username || user.email}</p>
                            <span className="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                              {user.clientType === 'B2B' ? 'B2B Account' : user.clientType === 'C2B' ? 'C2B Account' : user.role}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Link
                              to={user.role === 'client' ? '/account' : '/admin'}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {user.role === 'client' ? 'Account Dashboard' : 'Admin Area'}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setAccountMenuOpen(false);
                                void logout();
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Logout
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Link
                            to="/login"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Sign In
                          </Link>
                          <Link
                            to="/register"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Create Account
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {showWishlist && (
              <div className="relative" ref={wishlistMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setWishlistMenuOpen((state) => !state);
                    setCartMenuOpen(false);
                    setAccountMenuOpen(false);
                  }}
                  className="relative rounded-full p-2 transition hover:bg-white/10"
                  aria-label="Wishlist"
                  aria-expanded={wishlistMenuOpen}
                >
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-red-600">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {wishlistMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-3 w-[360px] rounded-xl border border-slate-200 bg-white shadow-xl z-50"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Heart className="h-4 w-4 text-rose-500" />
                          Wishlist
                        </div>
                        <button
                          type="button"
                          onClick={() => setWishlistSelectMode((prev) => !prev)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold transition',
                            wishlistSelectMode
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          )}
                        >
                          {wishlistSelectMode ? 'Selecting' : 'Select'}
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {wishlistItems.length === 0 && (
                          <div className="px-4 py-6 text-sm text-slate-600">No saved products yet.</div>
                        )}
                        {wishlistItems.map((line) => {
                          const product = wishlistProducts[line.productId];
                          const saleActive = product ? isSaleActive(product) : false;
                          const price = product
                            ? saleActive
                              ? (product.salePrice as number)
                              : product.price
                            : 0;
                          const isSelected = wishlistSelectedIds.has(line.productId);
                          return (
                            <div
                              key={line.productId}
                              className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50"
                            >
                              {wishlistSelectMode && (
                                <button
                                  type="button"
                                  onClick={() => toggleWishlistSelected(line.productId)}
                                  className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded border',
                                    isSelected
                                      ? 'border-rose-500 bg-rose-500 text-white'
                                      : 'border-slate-300 bg-white text-transparent'
                                  )}
                                  aria-label="Select item"
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-3 w-3"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
                                  </svg>
                                </button>
                              )}
                              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                <img
                                  src={product?.images?.[0] ?? 'https://placehold.co/64x64?text=Product'}
                                  alt={product?.name ?? 'Product'}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-900">
                                  {product?.name ?? 'Product'}
                                </p>
                                <p className="text-xs text-slate-500">{formatCurrency(price)}</p>
                              </div>
                              <div className="flex items-center gap-1 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => updateWishlistItem(line.productId, line.quantity - 1)}
                                  className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-primary"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center text-xs font-semibold text-slate-700">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateWishlistItem(line.productId, line.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-primary"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeWishlistItem(line.productId)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setWishlistMenuOpen(false);
                            navigate('/wishlist');
                          }}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Open wishlist
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleWishlistProceed()}
                          disabled={
                            wishlistItems.length === 0 ||
                            (wishlistSelectMode && wishlistSelectedIds.size === 0)
                          }
                          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Proceed
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="relative" ref={cartMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setCartMenuOpen((state) => !state);
                  setWishlistMenuOpen(false);
                  setAccountMenuOpen(false);
                }}
                className="relative rounded-full p-2 transition hover:bg-white/10"
                aria-label="Cart"
                aria-expanded={cartMenuOpen}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-red-600">
                  {cartCount}
                </span>
              </button>
              <AnimatePresence>
                {cartMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-3 w-[360px] rounded-xl border border-slate-200 bg-white shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShoppingCart className="h-4 w-4 text-red-600" />
                        Cart
                      </div>
                      <span className="text-xs text-slate-500">{cartCount} items</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {items.length === 0 && (
                        <div className="px-4 py-6 text-sm text-slate-600">Your cart is empty.</div>
                      )}
                      {items.map((line) => {
                        const product = cartProducts[line.productId];
                        const saleActive = product ? isSaleActive(product) : false;
                        const price = product
                          ? saleActive
                            ? (product.salePrice as number)
                            : product.price
                          : 0;
                        return (
                          <div
                            key={line.productId}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50"
                          >
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              <img
                                src={product?.images?.[0] ?? 'https://placehold.co/64x64?text=Product'}
                                alt={product?.name ?? 'Product'}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900">
                                {product?.name ?? 'Product'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatCurrency(price)} x {line.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateCartItem(line.productId, line.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-primary"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-xs font-semibold text-slate-700">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartItem(line.productId, line.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-primary"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCartItem(line.productId)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Subtotal</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(cartSubtotal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCartMenuOpen(false);
                          navigate('/checkout');
                        }}
                        disabled={items.length === 0}
                        className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Proceed to checkout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                {currentSection.items.length ? (
                  <div className="grid grid-cols-6 gap-3">
                    {currentSection.items.slice(0, 18).map((item) => (
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
                <form className="relative" onSubmit={handleSearchSubmit}>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </form>
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
              vehicleMakes={vehicleOptions.makes}
              vehicleModels={vehicleOptions.models}
              loading={vehicleOptionsLoading}
              onFindParts={() => {
                const params = new URLSearchParams();
                if (vehicleYear) params.append('vehicleYear', vehicleYear);
                if (vehicleMake) params.append('vehicleMake', vehicleMake);
                if (vehicleModel) params.append('vehicleModel', vehicleModel);
                navigate(`/products?${params.toString()}`);
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md xl:hidden" style={{ animation: mobileMenuClosing ? 'fadeOut 300ms ease-out' : 'fadeIn 300ms ease-out' }}>
          <aside
            ref={mobileMenuRef}
            className="flex h-full w-full max-w-xs flex-col bg-white shadow-2xl"
            style={{ animation: mobileMenuClosing ? 'slideOutToLeft 300ms ease-out' : 'slideInFromLeft 300ms ease-out' }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="ULK Supply logo" className="h-14 w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={mobileAccountMenuRef}>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white shadow-sm transition hover:ring-2 hover:ring-primary/40"
                    onClick={() => setMobileAccountMenuOpen((state) => !state)}
                    aria-label="Account"
                  >
                    {user?.profileImage ? (
                      <img
                        src={
                          user.profileImage.startsWith('http://') || user.profileImage.startsWith('https://')
                            ? user.profileImage
                            : `/uploads/${user.profileImage}`
                        }
                        alt={user?.name || 'Profile'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </button>

                  <AnimatePresence>
                    {mobileAccountMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50"
                      >
                        <div className="p-3">
                          {user ? (
                            <>
                              <div className="mb-3 rounded-lg bg-slate-50 p-3">
                                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.username || user.email}</p>
                                <span className="mt-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                                  {user.clientType === 'B2B' ? 'B2B Account' : user.clientType === 'C2B' ? 'C2B Account' : user.role}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <Link
                                  to={user.role === 'client' ? '/account' : '/admin'}
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => {
                                    setMobileAccountMenuOpen(false);
                                    closeMobileMenu();
                                  }}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {user.role === 'client' ? 'Account Dashboard' : 'Admin Area'}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileAccountMenuOpen(false);
                                    closeMobileMenu();
                                    void logout();
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                  </svg>
                                  Logout
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <Link
                                to="/login"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                onClick={() => {
                                  setMobileAccountMenuOpen(false);
                                  closeMobileMenu();
                                }}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Sign In
                              </Link>
                              <Link
                                to="/register"
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                onClick={() => {
                                  setMobileAccountMenuOpen(false);
                                  closeMobileMenu();
                                }}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Create Account
                              </Link>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {showWishlist && (
                  <button
                    type="button"
                    className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100"
                    onClick={() => {
                      closeMobileMenu();
                      setWishlistMenuOpen(true);
                      setCartMenuOpen(false);
                    }}
                    aria-label="Wishlist"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                        {wishlistCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100"
                  onClick={() => {
                    closeMobileMenu();
                    setCartMenuOpen(true);
                    setWishlistMenuOpen(false);
                  }}
                  aria-label="Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
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
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-100 bg-white">
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
                    <LinkIcon className="h-5 w-5 text-red-600" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-200 px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Left Column: Social, Phone, Location - 1/2 */}
                <div className="col-span-1 flex flex-col gap-2">
                  {/* Social Media Icons */}
                  <div className="flex gap-2">
                    {socialLinks.map(({ label, href, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        aria-label={label}
                        className="text-slate-600 transition-transform hover:scale-110 hover:text-red-600"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>

                  {/* Phone */}
                  <a
                    href="tel:+14074496740"
                    className="flex items-start gap-1.5 text-xs text-slate-600 transition hover:text-red-600"
                  >
                    <Phone className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>+1 (407) 449-6740</span>
                  </a>

                  {/* Location */}
                  <a
                    href="https://www.google.com/maps/place/ULK+Supply+LLC/@28.303457,-81.418344,14z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-xs text-slate-600 transition hover:text-red-600"
                  >
                    <MapPin className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>1508 W Vine St, Kissimmee, FL</span>
                  </a>
                </div>

                {/* Right Column: Map - 1/2 */}
                <div className="col-span-1 relative h-24 w-full overflow-hidden rounded-lg border border-slate-200 bg-black/10">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14051.322168483486!2d-81.418344!3d28.303457!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd851677b224a3%3A0x1d2529c0a54763e4!2sULK%20Supply%20LLC!5e0!3m2!1sen!2sus!4v1748259865220!5m2!1sen!2sus&disableDefaultUI=true&gestureHandling=cooperative&zoomControl=false&mapTypeControl=false&streetViewControl=false&fullscreenControl=false&iwloc=near"
                    title="ULK Supply Location"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full opacity-90 pointer-events-none"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};
