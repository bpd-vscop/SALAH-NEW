import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
import { categoryDisplayApi } from '../api/categoryDisplay';
import {
  featuredShowcaseApi,
  type FeaturedShowcaseItem,
  type FeaturedVariant,
  type FeaturedShowcasePayload,
} from '../api/featuredShowcase';
import { heroSlidesApi, type HeroSlide, type HeroSlidePayload } from '../api/heroSlides';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { manufacturersApi, type Manufacturer } from '../api/manufacturers';
import { menuApi, type MenuSectionInput, type MenuLinkInput } from '../api/menu';
import { adminMessagesApi } from '../api/messages';
import { AdminLayout } from '../components/layout/AdminLayout';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import type {
  // Banner,
  // BannerType,
  Category,
  Order,
  OrderStatus,
  Product,
  ProductTag,
  UserRole,
  ProductInventoryStatus,
} from '../types/api';
import { adminTabs, homepageTabs, navigationTabs } from '../utils/adminSidebar';
import { CategoriesAdminSection } from '../components/dashboard/CategoriesAdminSection';
import { ProductsAdminSection } from '../components/dashboard/ProductsAdminSection';
import { ProductInventoryAdminSection } from '../components/dashboard/ProductInventoryAdminSection';
import { ProductReviewsAdminSection } from '../components/dashboard/ProductReviewsAdminSection';
import { CouponsAdminSection } from '../components/dashboard/CouponsAdminSection';
import { TaxRatesAdminSection } from '../components/dashboard/TaxRatesAdminSection';
// import { BannersAdminSection } from '../components/dashboard/BannersAdminSection';
import { ManufacturersAdminSection } from '../components/dashboard/ManufacturersAdminSection';
import { ManufacturersDisplayAdminSection } from '../components/dashboard/ManufacturersDisplayAdminSection';
import { BrandsAdminSection } from '../components/dashboard/BrandsAdminSection';
import { ModelsAdminSection } from '../components/dashboard/ModelsAdminSection';
import { TagsAdminSection } from '../components/dashboard/TagsAdminSection';
import { HomepageAdminSection } from '../components/dashboard/HomepageAdminSection';
import { OrdersAdminSection } from '../components/dashboard/OrdersAdminSection';
import { InvoicesAdminSection } from '../components/dashboard/InvoicesAdminSection';
import { MessagesAdminSection } from '../components/dashboard/MessagesAdminSection';
import { NavigationAdminSection } from '../components/dashboard/NavigationAdminSection';
import type {
  // BannerFormState,
  CategoryFormState,
  CategoryDisplayFormState,
  ComposeClientRef,
  DeleteConfirmationState,
  FeatureFormState,
  HeroSlideFormState,
  OrderConflictState,
  ProductFormState,
  StatusSetter,
} from '../components/dashboard/types';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';
import { useLocation, useNavigate } from 'react-router-dom';
import { StaffManagementPanel } from '../components/dashboard/users/StaffManagementPanel';
import { ClientManagementPanel } from '../components/dashboard/users/ClientManagementPanel';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_HOMEPAGE_CATEGORIES = 18;
const MAX_MENU_QUICK_LINKS = 6;

const emptyFeatureForm = (variant: FeaturedVariant): FeatureFormState => ({
  variant,
  title: '',
  subtitle: '',
  category: '',
  offer: '',
  badgeText: '',
  ctaText: 'Shop Now',
  linkUrl: '',
  price: '',
  order: 1,
  image: '',
  altText: '',
});

// const bannerTypes: BannerType[] = ['slide', 'row', 'advertising'];
const orderStatuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const canEditOrders = (role: UserRole) => role === 'super_admin' || role === 'admin' || role === 'staff';
const canEditHomepage = (role: UserRole) => role === 'super_admin' || role === 'admin' || role === 'staff';
const canDeleteHomepage = (role: UserRole) => role === 'super_admin' || role === 'admin';

const isObjectId = (value?: string | null) => Boolean(value && /^[0-9a-fA-F]{24}$/.test(value));

const makeTempId = () => Math.random().toString(36).slice(2, 10);

const normalizeComposeClients = (input: unknown): ComposeClientRef[] => {
  if (!Array.isArray(input)) return [];
  const map = new Map<string, ComposeClientRef>();
  input.forEach((entry) => {
    if (typeof entry === 'string') {
      if (!entry) return;
      if (!map.has(entry)) {
        map.set(entry, { id: entry, name: null, email: null, clientType: null });
      }
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    const record = entry as { id?: unknown; userId?: unknown; name?: unknown; email?: unknown; clientType?: unknown };
    const id =
      typeof record.id === 'string'
        ? record.id
        : typeof record.userId === 'string'
          ? record.userId
          : null;
    if (!id) return;
    if (map.has(id)) return;
    map.set(id, {
      id,
      name: typeof record.name === 'string' ? record.name : null,
      email: typeof record.email === 'string' ? record.email : null,
      clientType: typeof record.clientType === 'string' ? record.clientType : null,
    });
  });
  return Array.from(map.values());
};

const makeEmptyCompatibilityRow = () => ({
  id: makeTempId(),
  yearStart: '',
  yearEnd: '',
  year: '',
  make: '',
  model: '',
  subModel: '',
  engine: '',
  notes: '',
});

const toDateTimeLocal = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const recordToRows = (record?: Record<string, string> | null) =>
  Object.entries(record ?? {}).map(([label, value]) => ({
    id: makeTempId(),
    label,
    value,
  }));

const normalizeCategoryIds = (primaryId?: string | null, categoryIds?: Array<string | null>) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const add = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    normalized.push(trimmed);
  };
  add(primaryId);
  (categoryIds ?? []).forEach(add);
  return normalized.length ? normalized : [''];
};

const parseYouTubeTimestamp = (value: string | null): number | null => {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (!hours && !minutes && !seconds) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const extractYouTubeVideo = (raw: string): { id: string; start?: number } | null => {
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] ?? null;
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] ?? null;
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }

    if (!videoId) {
      return null;
    }

    const start =
      parseYouTubeTimestamp(parsed.searchParams.get('t')) ??
      parseYouTubeTimestamp(parsed.searchParams.get('start'));

    return start ? { id: videoId, start } : { id: videoId };
  } catch {
    return null;
  }
};

const buildYouTubeEmbedUrl = (id: string, start?: number) => {
  const params = new URLSearchParams();
  if (start && start > 0) {
    params.set('start', String(start));
  }
  params.set('autoplay', '1');
  params.set('mute', '1');
  params.set('controls', '0');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  params.set('enablejsapi', '1');
  params.set('fs', '0');
  params.set('iv_load_policy', '3');
  params.set('showinfo', '0');
  params.set('disablekb', '1');
  const query = params.toString();
  return `https://www.youtube.com/embed/${id}?${query}`;
};

const normalizeYouTubeUrl = (raw: string): string | null => {
  const parsed = extractYouTubeVideo(raw);
  if (!parsed) {
    return null;
  }
  return buildYouTubeEmbedUrl(parsed.id, parsed.start);
};

const createEmptyProductForm = (): ProductFormState => ({
  name: '',
  slug: '',
  sku: '',
  productCode: '',
  productType: '',
  status: 'draft',
  visibility: 'catalog-and-search',
  categoryIds: [''],
  manufacturerId: '',
  manufacturerName: '',
  shortDescription: '',
  description: '',
  price: '',
  cost: '',
  salePrice: '',
  saleStartDate: '',
  saleEndDate: '',
  taxClass: '',
  featureHighlights: [],
  tags: new Set<ProductTag>(),
  primaryImage: '',
  galleryImages: [],
  videoUrls: [],
  packageContents: [],
  specifications: [],
  attributes: [],
  customAttributes: [],
  variationAttributes: [],
  variations: [],
  serialNumbers: [],
  documents: [],
  compatibility: [makeEmptyCompatibilityRow()],
  relatedProductIds: [],
  upsellProductIds: [],
  crossSellProductIds: [],
  manageStock: true,
  inventory: {
    quantity: '',
    lowStockThreshold: '',
    status: '' as ProductInventoryStatus | '',
    allowBackorder: false,
    leadTime: '',
  },
  shipping: {
    weight: '',
    weightUnit: 'lb',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'in',
    shippingClass: '',
    hazardous: false,
    warehouseLocation: '',
  },
  seo: {
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    openGraphImage: '',
  },
  support: {
    warranty: '',
    returnPolicy: '',
    supportPhone: '',
    supportEmail: '',
    liveChatUrl: '',
    supportHours: '',
  },
  badges: [],
  notes: {
    sales: '',
    internal: '',
  },
  requiresB2B: true,
  reviewsSummary: {
    averageRating: '',
    reviewCount: '',
    ratingBreakdown: [],
  },
});

const mapProductToForm = (product: Product): ProductFormState => ({
  name: product.name ?? '',
  slug: product.slug ?? '',
  sku: product.sku ?? '',
  productCode: product.productCode ?? '',
  productType: product.productType ?? '',
  status: product.status ?? '',
  visibility: product.visibility ?? 'catalog-and-search',
  categoryIds: normalizeCategoryIds(product.categoryId ?? null, product.categoryIds ?? []),
  manufacturerId: product.manufacturerId ?? '',
  manufacturerName: product.manufacturerName ?? '',
  shortDescription: product.shortDescription ?? '',
  description: product.description ?? '',
  price: typeof product.price === 'number' ? String(product.price) : '',
  cost: product.cost != null ? String(product.cost) : '',
  salePrice: product.salePrice != null ? String(product.salePrice) : '',
  saleStartDate: toDateTimeLocal(product.saleStartDate ?? null),
  saleEndDate: toDateTimeLocal(product.saleEndDate ?? null),
  taxClass: product.taxClass ?? '',
  featureHighlights: [...(product.featureHighlights ?? [])],
  tags: new Set((product.tags ?? []).filter((tag) => tag === 'coming soon')),
  primaryImage: product.images?.[0] ?? '',
  galleryImages: [...(product.images?.slice(1) ?? [])],
  videoUrls: [...(product.videoUrls ?? [])],
  packageContents: [...(product.packageContents ?? [])],
  specifications: (product.specifications ?? []).map((spec) => ({
    id: makeTempId(),
    label: spec.label,
    value: spec.value,
  })),
  attributes: recordToRows(product.attributes ?? undefined),
  customAttributes: recordToRows(product.customAttributes ?? undefined),
  variationAttributes: [...(product.variationAttributes ?? [])],
  variations: (product.variations ?? []).map((variation) => ({
    id: makeTempId(),
    existingId: variation.id,
    name: variation.name ?? '',
    sku: variation.sku ?? '',
    attributes: recordToRows(variation.attributes ?? undefined),
    price: variation.price != null ? String(variation.price) : '',
    salePrice: variation.salePrice != null ? String(variation.salePrice) : '',
    stockQuantity: variation.stockQuantity != null ? String(variation.stockQuantity) : '',
    allowBackorder: variation.allowBackorder ?? false,
    image: variation.image ?? '',
    weight: variation.weight != null ? String(variation.weight) : '',
  })),
  serialNumbers: (product.serialNumbers ?? []).map((serial) => ({
    id: makeTempId(),
    existingId: serial.id,
    serialNumber: serial.serialNumber ?? '',
    status: serial.status ?? 'available',
    soldDate: toDateTimeLocal(serial.soldDate ?? null),
    orderId: serial.orderId ?? '',
    notes: serial.notes ?? '',
  })),
  documents: (product.documents ?? []).map((doc) => ({
    id: makeTempId(),
    label: doc.label,
    url: doc.url,
  })),
  compatibility: (() => {
    const rows = (product.compatibility ?? []).map((entry) => ({
      id: makeTempId(),
      yearStart: entry.yearStart != null ? String(entry.yearStart) : '',
      yearEnd: entry.yearEnd != null ? String(entry.yearEnd) : '',
      year: entry.year != null ? String(entry.year) : '',
      make: entry.make ?? '',
      model: entry.model ?? '',
      subModel: entry.subModel ?? '',
      engine: entry.engine ?? '',
      notes: entry.notes ?? '',
    }));
    return rows.length ? rows : [makeEmptyCompatibilityRow()];
  })(),
  relatedProductIds: [...(product.relatedProductIds ?? [])],
  upsellProductIds: [...(product.upsellProductIds ?? [])],
  crossSellProductIds: [...(product.crossSellProductIds ?? [])],
  manageStock: product.manageStock ?? true,
  inventory: {
    quantity: product.inventory?.quantity != null ? String(product.inventory.quantity) : '',
    lowStockThreshold:
      product.inventory?.lowStockThreshold != null ? String(product.inventory.lowStockThreshold) : '',
    status: product.inventory?.status ?? '' as ProductInventoryStatus | '',
    allowBackorder: product.inventory?.allowBackorder ?? false,
    leadTime: product.inventory?.leadTime ?? '',
  },
  shipping: {
    weight: product.shipping?.weight != null ? String(product.shipping.weight) : '',
    weightUnit: product.shipping?.weightUnit ?? 'lb',
    length: product.shipping?.dimensions?.length != null ? String(product.shipping.dimensions.length) : '',
    width: product.shipping?.dimensions?.width != null ? String(product.shipping.dimensions.width) : '',
    height: product.shipping?.dimensions?.height != null ? String(product.shipping.dimensions.height) : '',
    dimensionUnit: product.shipping?.dimensions?.unit ?? 'in',
    shippingClass: product.shipping?.shippingClass ?? '',
    hazardous: product.shipping?.hazardous ?? false,
    warehouseLocation: product.shipping?.warehouseLocation ?? '',
  },
  seo: {
    metaTitle: product.seo?.metaTitle ?? '',
    metaDescription: product.seo?.metaDescription ?? '',
    canonicalUrl: product.seo?.canonicalUrl ?? '',
    openGraphImage: product.seo?.openGraphImage ?? '',
  },
  support: {
    warranty: product.support?.warranty ?? '',
    returnPolicy: product.support?.returnPolicy ?? '',
    supportPhone: product.support?.supportPhone ?? '',
    supportEmail: product.support?.supportEmail ?? '',
    liveChatUrl: product.support?.liveChatUrl ?? '',
    supportHours: product.support?.supportHours ?? '',
  },
  badges: (product.badges ?? []).map((badge) => ({
    id: makeTempId(),
    label: badge.label ?? '',
    description: badge.description ?? '',
    icon: badge.icon ?? '',
  })),
  notes: {
    sales: product.notes?.sales ?? '',
    internal: product.notes?.internal ?? '',
  },
  requiresB2B: product.requiresB2B ?? true,
  reviewsSummary: {
    averageRating: product.reviewsSummary?.averageRating != null ? String(product.reviewsSummary.averageRating) : '',
    reviewCount: product.reviewsSummary?.reviewCount != null ? String(product.reviewsSummary.reviewCount) : '',
    ratingBreakdown: Object.entries(product.reviewsSummary?.ratingBreakdown ?? {}).map(([rating, count]) => ({
      id: makeTempId(),
      rating,
      count: String(count),
    })),
  },
});

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? 'client';
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('users');
  const [usersSection, setUsersSection] = useState<'staff' | 'clients'>('staff');
  const [ordersSection, setOrdersSection] = useState<'orders' | 'invoices'>('orders');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  // const [banners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [composeRequest, setComposeRequest] = useState<{ clients: ComposeClientRef[] } | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedShowcaseItem[]>([]);
  const [menuSectionsDraft, setMenuSectionsDraft] = useState<MenuSectionInput[]>([]);
  const [menuLinksDraft, setMenuLinksDraft] = useState<MenuLinkInput[]>([]);
  const [promoText, setPromoText] = useState('🚚 Free Shipping Over $200');
  const [promoVisible, setPromoVisible] = useState(true);
  const [savingMenu, setSavingMenu] = useState(false);
  const [categoryDisplayForm, setCategoryDisplayForm] = useState<CategoryDisplayFormState>({
    homepageAssignments: {},
    allCategoriesHeroImage: '',
  });
  const [savingCategoryDisplay, setSavingCategoryDisplay] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    parentId: '',
    imageUrl: '',
    heroImageUrl: '',
  });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productForm, setProductForm] = useState<ProductFormState>(() => createEmptyProductForm());

  // const [selectedBannerId] = useState<string>('');
  // const [bannerForm, setBannerForm] = useState<BannerFormState>({
  //   type: 'slide',
  //   imageUrl: '',
  //   text: '',
  //   linkUrl: '',
  //   order: 0,
  //   isActive: true,
  // });

  const [selectedHeroSlideId, setSelectedHeroSlideId] = useState<string>('');
  const [heroSlideForm, setHeroSlideForm] = useState<HeroSlideFormState>({
    title: '',
    subtitle: '',
    caption: '',
    ctaText: 'Shop Now',
    linkUrl: '',
    order: 1,
    desktopImage: '',
    mobileImage: '',
    altText: '',
  });

  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [featureForm, setFeatureForm] = useState<FeatureFormState>(() => emptyFeatureForm('feature'));

  const [homepageSection, setHomepageSection] = useState<'hero' | 'featured' | 'categorydisplay' | 'manufacturers'>('hero');
  const [catalogSection, setCatalogSection] = useState<'categories' | 'manufacturers' | 'brands' | 'models' | 'tags'>('categories');
  const [navigationSection, setNavigationSection] = useState<'topnav' | 'sections' | 'quicklinks' | 'visible'>('topnav');
  const [productsView, setProductsView] = useState<'all' | 'add' | 'inventory' | 'list' | 'coupons' | 'taxes'>('all');
  const [activeFeatureTab, setActiveFeatureTab] = useState<'feature' | 'tile'>('feature');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>(null);
  const [orderConflict, setOrderConflict] = useState<OrderConflictState>(null);

  useEffect(() => {
    const state = (location.state ?? null) as
      | {
          active?: string;
          homepageSection?: 'hero' | 'featured';
          usersSection?: 'staff' | 'clients';
          openCompose?: boolean;
          preselectedClients?: unknown;
        }
      | null;

    const preselectedClients = normalizeComposeClients(state?.preselectedClients);
    const shouldOpenCompose = Boolean(state?.openCompose) || preselectedClients.length > 0;

    if (state?.active) {
      if (state.active === 'homepage') {
        if (state.homepageSection) {
          setHomepageSection(state.homepageSection);
        }
        setActiveTab('homepage');
      } else if (state.active === 'users') {
        if (state.usersSection === 'staff' || state.usersSection === 'clients') {
          setUsersSection(state.usersSection);
        }
        setActiveTab('users');
      } else if (adminTabs.some((tab) => tab.id === state.active)) {
        setActiveTab(state.active as (typeof adminTabs)[number]['id']);
      }
    } else if (state?.usersSection === 'staff' || state?.usersSection === 'clients') {
      setUsersSection(state.usersSection);
      setActiveTab('users');
    }

    if (shouldOpenCompose) {
      setComposeRequest({ clients: preselectedClients });
      setActiveTab('messages');
    }

    if (state?.active || state?.homepageSection || state?.usersSection || state?.openCompose || state?.preselectedClients) {
      navigate('/admin', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const refreshCategories = async () => {
    const { categories: data } = await categoriesApi.list();
    setCategories(data);
  };

  const refreshProducts = async () => {
    const { products: data } = await productsApi.list({ includeSerials: true });
    setProducts(data);
  };

  const refreshManufacturers = async () => {
    const { manufacturers: data } = await manufacturersApi.list();
    setManufacturers(data);
  };

  const refreshBanners = async () => { /* manufacturers replaces this section */ };

  const refreshHeroSlider = async () => {
    const { slides } = await heroSlidesApi.list();
    setHeroSlides(slides);
  };

  const refreshFeaturedShowcase = async () => {
    const { items } = await featuredShowcaseApi.list();
    setFeaturedItems(items);
  };

  const refreshOrders = async () => {
    const { orders: data } = await ordersApi.list();
    setOrders(data);
  };

  const refreshMessagesUnread = async () => {
    try {
      const { conversations } = await adminMessagesApi.listConversations();
      const total = conversations.reduce((sum, conv) => sum + (conv.unreadCount ?? 0), 0);
      setMessagesUnreadCount(total);
    } catch (error) {
      console.error('Failed to refresh messages unread count', error);
    }
  };

  const refreshMenu = async () => {
    const { menu } = await menuApi.get();
    const sections = menu.sections ?? [];
    const links = menu.links ?? [];
    const promo = menu.promo ?? { text: '🚚 Free Shipping Over $200', visible: true };

    setMenuSectionsDraft(
      sections.map((section, sectionIndex) => ({
        id: section.id,
        name: section.name,
        icon: section.icon,
        order: section.order ?? sectionIndex,
        items: (section.items ?? []).map((item, itemIndex) => ({
          id: item.id,
          categoryId: item.categoryId ?? '',
          productId: item.productId ?? undefined,
          order: item.order ?? itemIndex,
        })),
        visible: section.visible !== false,
      }))
    );

    setMenuLinksDraft(
      links.map((link, linkIndex) => ({
        id: link.id,
        label: link.label,
        href: link.href,
        order: link.order ?? linkIndex,
        visible: link.visible !== false,
      }))
    );

    setPromoText(promo.text);
    setPromoVisible(promo.visible);
  };

  const refreshCategoryDisplay = async () => {
    const { settings } = await categoryDisplayApi.get();
    const assignments: Record<number, string> = {};
    settings.homepageCategories.slice(0, MAX_HOMEPAGE_CATEGORIES).forEach((id, index) => {
      if (id) {
        assignments[index + 1] = id;
      }
    });
    setCategoryDisplayForm({
      homepageAssignments: assignments,
      allCategoriesHeroImage: settings.allCategoriesHeroImage ?? '',
    });
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          refreshCategories(),
          refreshProducts(),
          refreshBanners(),
          refreshManufacturers(),
          refreshHeroSlider(),
          refreshFeaturedShowcase(),
          refreshOrders(),
          refreshMessagesUnread(),
          refreshMenu(),
          refreshCategoryDisplay(),
        ]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      }
    };

    void loadAll();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => void refreshMessagesUnread(), 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Kick off an extra early refresh for homepage content to avoid perceived delays.
  useEffect(() => {
    void refreshHeroSlider();
    void refreshFeaturedShowcase();
  }, []);

  useEffect(() => {
    if (activeTab !== 'homepage') {
      setHomepageSection('hero');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setCategoryForm({ name: '', parentId: '', imageUrl: '', heroImageUrl: '' });
      return;
    }

    const existing = categories.find((category) => category.id === selectedCategoryId);
    if (existing) {
      setCategoryForm({
        name: existing.name,
        parentId: existing.parentId ?? '',
        imageUrl: existing.imageUrl ?? '',
        heroImageUrl: existing.heroImageUrl ?? '',
      });
    }
  }, [selectedCategoryId, categories]);

  useEffect(() => {
    setCategoryDisplayForm((state) => ({
      ...state,
      homepageAssignments: Object.fromEntries(
        Object.entries(state.homepageAssignments)
          .filter(([, id]) => categories.some((category) => category.id === id))
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .slice(0, MAX_HOMEPAGE_CATEGORIES)
      ) as Record<number, string>,
    }));
  }, [categories]);

  useEffect(() => {
    if (!selectedProductId) {
      setProductForm(createEmptyProductForm());
      return;
    }

    const existing = products.find((product) => product.id === selectedProductId);
    if (existing) {
      setProductForm(mapProductToForm(existing));
    }
  }, [selectedProductId, products]);

  // Also reset form when switching to 'add' view with no selected product
  useEffect(() => {
    if (productsView === 'add' && !selectedProductId) {
      setProductForm(createEmptyProductForm());
    }
  }, [productsView, selectedProductId]);

  // Banners no longer used for manufacturers management

  useEffect(() => {
    if (!selectedHeroSlideId) {
      const nextOrder = heroSlides.reduce((max, s) => Math.max(max, s.order ?? 0), 0) + 1;
      setHeroSlideForm({
        title: '',
        subtitle: '',
        caption: '',
        ctaText: 'Shop Now',
        linkUrl: '',
        order: nextOrder,
        desktopImage: '',
        mobileImage: '',
        altText: '',
      });
      return;
    }

    const existing = heroSlides.find((slide) => slide.id === selectedHeroSlideId);
    if (existing) {
      setHeroSlideForm({
        title: existing.title,
        subtitle: existing.subtitle ?? '',
        caption: existing.caption ?? '',
        ctaText: existing.ctaText ?? 'Shop Now',
        linkUrl: existing.linkUrl,
        order: existing.order ?? 0,
        desktopImage: existing.desktopImage,
        mobileImage: existing.mobileImage,
        altText: existing.altText ?? '',
      });
    }
  }, [selectedHeroSlideId, heroSlides]);

  useEffect(() => {
    if (!selectedFeatureId) {
      const maxOrder = featuredItems
        .filter((item) => item.variant === activeFeatureTab)
        .reduce((max, it) => Math.max(max, it.order ?? 0), 0);
      setFeatureForm({ ...emptyFeatureForm(activeFeatureTab), order: maxOrder + 1 });
      return;
    }

    const existing = featuredItems.find((item) => item.id === selectedFeatureId);
    if (existing) {
      if (activeFeatureTab !== existing.variant) {
        setActiveFeatureTab(existing.variant);
      }
      setFeatureForm({
        variant: existing.variant,
        title: existing.title,
        subtitle: existing.subtitle ?? '',
        category: existing.category ?? '',
        offer: existing.offer ?? '',
        badgeText: existing.badgeText ?? '',
        ctaText: existing.ctaText ?? 'Shop Now',
        linkUrl: existing.linkUrl,
        price: existing.price ?? '',
        order: existing.order ?? 0,
        image: existing.image,
        altText: existing.altText ?? '',
      });
    }
  }, [selectedFeatureId, featuredItems, activeFeatureTab]);

  useEffect(() => {
    if (homepageSection !== 'featured') {
      setActiveFeatureTab('feature');
      setSelectedFeatureId('');
    }
  }, [homepageSection]);

  // When switching feature variant while creating (no selection), set next order in that variant
  useEffect(() => {
    if (!selectedFeatureId && homepageSection === 'featured') {
      const maxOrder = featuredItems
        .filter((item) => item.variant === activeFeatureTab)
        .reduce((max, it) => Math.max(max, it.order ?? 0), 0);
      setFeatureForm((prev) => ({ ...prev, variant: activeFeatureTab, order: maxOrder + 1 }));
    }
  }, [activeFeatureTab, selectedFeatureId, homepageSection, featuredItems]);

  const setStatus: StatusSetter = (message, errorMessage = null) => {
    setStatusMessage(message);
    setError(errorMessage);
    if (message) {
      window.setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const imageUrlValue = categoryForm.imageUrl.trim();
      const heroImageUrlValue = categoryForm.heroImageUrl.trim();

      const payload: {
        name: string;
        parentId: string | null;
        imageUrl?: string | null;
        heroImageUrl?: string | null;
      } = {
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId || null,
      };

      if (!selectedCategoryId) {
        payload.imageUrl = imageUrlValue || null;
        payload.heroImageUrl = heroImageUrlValue || null;
      } else {
        if (!imageUrlValue) {
          payload.imageUrl = null;
        } else if (imageUrlValue.startsWith('/uploads/')) {
          payload.imageUrl = imageUrlValue;
        }

        if (!heroImageUrlValue) {
          payload.heroImageUrl = null;
        } else if (heroImageUrlValue.startsWith('/uploads/')) {
          payload.heroImageUrl = heroImageUrlValue;
        }
      }

      if (selectedCategoryId) {
        await categoriesApi.update(selectedCategoryId, payload);
        setStatus('Category updated');
      } else {
        await categoriesApi.create(payload);
        setStatus('Category created');
      }
      await refreshCategories();
      setSelectedCategoryId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Category operation failed');
    }
  };

  const handleCategoryDisplaySave = async () => {
    setSavingCategoryDisplay(true);
    try {
      const orderedCategories = Object.entries(categoryDisplayForm.homepageAssignments)
        .filter(([, id]) => Boolean(id))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, id]) => id)
        .slice(0, MAX_HOMEPAGE_CATEGORIES);

      const heroValue = categoryDisplayForm.allCategoriesHeroImage.trim();
      const payload: { homepageCategories: string[]; allCategoriesHeroImage?: string | null } = {
        homepageCategories: orderedCategories,
      };
      if (!heroValue) {
        payload.allCategoriesHeroImage = null;
      } else if (heroValue.startsWith('/uploads/')) {
        payload.allCategoriesHeroImage = heroValue;
      }

      await categoryDisplayApi.update(payload);
      setStatus('Category display updated');
      await refreshCategoryDisplay();
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to update category display');
    } finally {
      setSavingCategoryDisplay(false);
    }
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check HTML5 form validity
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    try {
      const cleanStringArray = (values: string[]) => {
        const seen = new Set<string>();
        return values
          .map((value) => value.trim())
          .filter((value) => {
            if (!value) return false;
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
          });
      };

      const rowsToRecord = (rows: ProductFormState['attributes']) => {
        const record: Record<string, string> = {};
        rows.forEach((row) => {
          const key = row.label.trim();
          const value = row.value.trim();
          if (key && value) {
            record[key] = value;
          }
        });
        return Object.keys(record).length ? record : undefined;
      };

      const specificationPayload = productForm.specifications
        .map((row) => ({
          label: row.label.trim(),
          value: row.value.trim(),
        }))
        .filter((row) => row.label && row.value);

      const documentsPayload = productForm.documents
        .map((row) => ({
          label: row.label.trim(),
          url: row.url.trim(),
        }))
        .filter((row) => row.label && row.url);

      const compatibilityPayload = productForm.compatibility
        .map((row) => {
          const base = {
            make: row.make.trim(),
            model: row.model.trim(),
            subModel: row.subModel.trim() || undefined,
            engine: row.engine.trim() || undefined,
            notes: row.notes.trim() || undefined,
          };
          const year = row.year.trim() ? Number(row.year) : undefined;
          const yearStart = row.yearStart.trim() ? Number(row.yearStart) : undefined;
          const yearEnd = row.yearEnd.trim() ? Number(row.yearEnd) : undefined;
          return {
            ...base,
            year: Number.isFinite(year ?? NaN) ? year : undefined,
            yearStart: Number.isFinite(yearStart ?? NaN) ? yearStart : undefined,
            yearEnd: Number.isFinite(yearEnd ?? NaN) ? yearEnd : undefined,
          };
        })
        .filter((entry) => entry.make && entry.model);

      const variationAttributes = cleanStringArray(productForm.variationAttributes);

      const variationsPayload = productForm.variations
        .map((variation) => {
          const attributes = rowsToRecord(variation.attributes) ?? undefined;
          const price = variation.price.trim() ? Number(variation.price) : undefined;
          const salePrice = variation.salePrice.trim() ? Number(variation.salePrice) : undefined;
          const stockQuantity = variation.stockQuantity.trim()
            ? Number.parseInt(variation.stockQuantity, 10)
            : undefined;
          const weight = variation.weight.trim() ? Number(variation.weight) : undefined;
          return {
            ...(variation.existingId ? { _id: variation.existingId } : {}),
            sku: variation.sku.trim() || undefined,
            name: variation.name.trim() || undefined,
            attributes,
            price,
            salePrice: Number.isFinite(salePrice ?? NaN) ? salePrice : undefined,
            stockQuantity: Number.isFinite(stockQuantity ?? NaN) ? stockQuantity : undefined,
            allowBackorder: variation.allowBackorder,
            image: variation.image.trim() || undefined,
            weight: Number.isFinite(weight ?? NaN) ? weight : undefined,
          };
        })
        .filter(
          (variation) =>
            variation.sku ||
            variation.name ||
            (variation.attributes && Object.keys(variation.attributes).length) ||
            typeof variation.price === 'number' ||
            typeof variation.salePrice === 'number'
        );

      const serialNumbersPayload = productForm.serialNumbers
        .map((serial) => ({
          ...(serial.existingId ? { _id: serial.existingId } : {}),
          serialNumber: serial.serialNumber.trim(),
          status: serial.status || 'available',
          soldDate: serial.soldDate ? new Date(serial.soldDate).toISOString() : undefined,
          orderId: serial.orderId.trim() || undefined,
          notes: serial.notes.trim() || undefined,
        }))
        .filter((serial) => serial.serialNumber);

      const badgesPayload = productForm.badges
        .map((badge) => ({
          label: badge.label.trim(),
          description: badge.description.trim(),
          icon: badge.icon.trim(),
        }))
        .filter((badge) => badge.label);

      const ratingBreakdownPayload = productForm.reviewsSummary.ratingBreakdown.reduce<Record<string, number>>(
        (acc, row) => {
          const ratingKey = row.rating.trim();
          const count = row.count.trim() ? Number(row.count) : 0;
          if (!ratingKey) {
            return acc;
          }
          const parsedCount = Number.isFinite(count) ? count : 0;
          acc[ratingKey] = parsedCount;
          return acc;
        },
        {}
      );

      const parseNumber = (value: string) => {
        if (!value.trim()) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const priceValue = parseNumber(productForm.price) ?? 0;
      const costValue = parseNumber(productForm.cost);
      const salePriceParsed = parseNumber(productForm.salePrice);
      const inventoryQuantity = parseNumber(productForm.inventory.quantity);
      const lowStock = parseNumber(productForm.inventory.lowStockThreshold);

      const shippingWeight = parseNumber(productForm.shipping.weight);
      const dimensionLength = parseNumber(productForm.shipping.length);
      const dimensionWidth = parseNumber(productForm.shipping.width);
      const dimensionHeight = parseNumber(productForm.shipping.height);

      const relatedIds = cleanStringArray(productForm.relatedProductIds);
      const upsellIds = cleanStringArray(productForm.upsellProductIds);
      const crossSellIds = cleanStringArray(productForm.crossSellProductIds);
      const normalizedCategoryIds = cleanStringArray(productForm.categoryIds);
      const primaryCategoryId = normalizedCategoryIds[0] ?? '';
      const manageStock = productForm.manageStock;

      const normalizedVideoUrls: string[] = [];
      for (const url of productForm.videoUrls) {
        const normalized = normalizeYouTubeUrl(url);
        if (!normalized) {
          setStatus(null, 'Video URLs must be valid YouTube links (for example https://youtu.be/VIDEO).');
          return;
        }
        normalizedVideoUrls.push(normalized);
      }

      const normalizedPrimaryImage = productForm.primaryImage.trim();
      const normalizedGalleryImages = cleanStringArray(productForm.galleryImages);
      const imageSet = new Set<string>();
      const imagesPayload: string[] = [];
      if (normalizedPrimaryImage) {
        imageSet.add(normalizedPrimaryImage);
        imagesPayload.push(normalizedPrimaryImage);
      }
      normalizedGalleryImages.forEach((image) => {
        if (imageSet.has(image)) {
          return;
        }
        imageSet.add(image);
        imagesPayload.push(image);
      });

      const inventoryPayload = manageStock
        ? {
            quantity: Number.isFinite(inventoryQuantity ?? NaN) ? inventoryQuantity ?? undefined : undefined,
            lowStockThreshold: Number.isFinite(lowStock ?? NaN) ? lowStock ?? undefined : undefined,
            status: productForm.inventory.status || undefined,
            allowBackorder: productForm.inventory.allowBackorder,
            leadTime: productForm.inventory.leadTime.trim() || undefined,
          }
        : null;

      const payload = {
        name: productForm.name.trim(),
        slug: productForm.slug.trim() || undefined,
        sku: productForm.sku.trim() || undefined,
        productCode: productForm.productCode.trim() || undefined,
        productType: productForm.productType || undefined,
        status: productForm.status || undefined,
        visibility: productForm.visibility || undefined,
        requiresB2B: productForm.requiresB2B,
        manageStock,
        categoryId: primaryCategoryId,
        categoryIds: normalizedCategoryIds.length ? normalizedCategoryIds : undefined,
        manufacturerId: productForm.manufacturerId ? productForm.manufacturerId : null,
        manufacturerName: productForm.manufacturerName.trim() || undefined,
        shortDescription: productForm.shortDescription.trim() || undefined,
        description: productForm.description.trim(),
        videoUrls: normalizedVideoUrls.length ? normalizedVideoUrls : undefined,
        price: priceValue,
        cost: costValue != null ? costValue : selectedProductId ? null : undefined,
        salePrice:
          salePriceParsed != null
            ? Number.isFinite(salePriceParsed)
              ? salePriceParsed
              : undefined
            : selectedProductId
              ? null
              : undefined,
        saleStartDate: productForm.saleStartDate
          ? new Date(productForm.saleStartDate).toISOString()
          : selectedProductId
            ? null
            : undefined,
        saleEndDate: productForm.saleEndDate
          ? new Date(productForm.saleEndDate).toISOString()
          : selectedProductId
            ? null
            : undefined,
        taxClass: productForm.taxClass.trim() || undefined,
        tags: Array.from(productForm.tags),
        featureHighlights: cleanStringArray(productForm.featureHighlights),
        images: imagesPayload,
        packageContents: cleanStringArray(productForm.packageContents),
        specifications: specificationPayload,
        attributes: rowsToRecord(productForm.attributes),
        customAttributes: rowsToRecord(productForm.customAttributes),
        variationAttributes: variationAttributes.length ? variationAttributes : undefined,
        variations: variationsPayload.length ? variationsPayload : undefined,
        serialNumbers: serialNumbersPayload.length ? serialNumbersPayload : undefined,
        documents: documentsPayload.length ? documentsPayload : undefined,
        compatibility: compatibilityPayload.length ? compatibilityPayload : undefined,
        relatedProductIds: relatedIds.length ? relatedIds : undefined,
        upsellProductIds: upsellIds.length ? upsellIds : undefined,
        crossSellProductIds: crossSellIds.length ? crossSellIds : undefined,
        inventory: inventoryPayload,
        shipping: {
          weight: Number.isFinite(shippingWeight ?? NaN) ? shippingWeight ?? undefined : undefined,
          weightUnit: productForm.shipping.weightUnit.trim() || undefined,
          dimensions: {
            length: Number.isFinite(dimensionLength ?? NaN) ? dimensionLength ?? undefined : undefined,
            width: Number.isFinite(dimensionWidth ?? NaN) ? dimensionWidth ?? undefined : undefined,
            height: Number.isFinite(dimensionHeight ?? NaN) ? dimensionHeight ?? undefined : undefined,
            unit: productForm.shipping.dimensionUnit.trim() || undefined,
          },
          shippingClass: productForm.shipping.shippingClass.trim() || undefined,
          hazardous: productForm.shipping.hazardous,
          warehouseLocation: productForm.shipping.warehouseLocation.trim() || undefined,
        },
        seo: {
          metaTitle: productForm.seo.metaTitle.trim() || undefined,
          metaDescription: productForm.seo.metaDescription.trim() || undefined,
          canonicalUrl: productForm.seo.canonicalUrl.trim() || undefined,
          openGraphImage: productForm.seo.openGraphImage.trim() || undefined,
        },
        support: {
          warranty: productForm.support.warranty.trim() || undefined,
          returnPolicy: productForm.support.returnPolicy.trim() || undefined,
          supportPhone: productForm.support.supportPhone.trim() || undefined,
          supportEmail: productForm.support.supportEmail.trim() || undefined,
          liveChatUrl: productForm.support.liveChatUrl.trim() || undefined,
          supportHours: productForm.support.supportHours.trim() || undefined,
        },
        badges: badgesPayload.length ? badgesPayload : undefined,
        notes: {
          sales: productForm.notes.sales.trim() || undefined,
          internal: productForm.notes.internal.trim() || undefined,
        },
        reviewsSummary:
          productForm.reviewsSummary.averageRating.trim() ||
          productForm.reviewsSummary.reviewCount.trim() ||
          Object.keys(ratingBreakdownPayload).length
            ? {
                averageRating: parseNumber(productForm.reviewsSummary.averageRating),
                reviewCount: parseNumber(productForm.reviewsSummary.reviewCount),
                ratingBreakdown: Object.keys(ratingBreakdownPayload).length ? ratingBreakdownPayload : undefined,
              }
            : undefined,
      };

      if (selectedProductId) {
        await productsApi.update(selectedProductId, payload);
        setStatus('Product updated');
      } else {
        await productsApi.create(payload);
        setStatus('Product created successfully!');
      }

      // Refresh and reset everything
      await refreshProducts();

      // Important: Reset in the correct order
      setSelectedProductId(''); // This will trigger form reset in useEffect
      setProductsView('all'); // Switch to product list view

      // Force form reset to ensure it's clean for next use
      setTimeout(() => {
        setProductForm(createEmptyProductForm());
      }, 0);
    } catch (err) {
      console.error('Product submission error:', err);
      if (err instanceof Error) {
        const errorWithDetails = err as Error & { details?: unknown };
        console.log('Error details structure:', errorWithDetails.details);
        if (errorWithDetails.details) {
          console.error('Validation details:', JSON.stringify(errorWithDetails.details, null, 2));
        }
      }
      setStatus(null, err instanceof Error ? err.message : 'Product operation failed');
    }
  };

  // const handleBannerSubmit = async (_event: FormEvent<HTMLFormElement>) => { /* unused now */ };

  const deleteCategory = async (id: string) => {
    try {
      await categoriesApi.delete(id);
      await refreshCategories();
      setStatus('Category deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete category');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(id);
      await refreshProducts();
      setStatus('Product deleted');
      setDeleteConfirmation(null);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete product');
      setDeleteConfirmation(null);
    }
  };

  const deleteBulkProducts = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => productsApi.delete(id)));
      await refreshProducts();
      setStatus(`${ids.length} product${ids.length > 1 ? 's' : ''} deleted`);
      setDeleteConfirmation(null);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete products');
      setDeleteConfirmation(null);
    }
  };

  // const deleteBanner = async (_id: string) => { /* unused now */ };

  const handleHeroSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!heroSlideForm.desktopImage || !heroSlideForm.mobileImage) {
        setStatus(null, 'Desktop and mobile images are required');
        return;
      }

      const desktopImageValue = heroSlideForm.desktopImage.trim();
      const mobileImageValue = heroSlideForm.mobileImage.trim();
      const desktopIsUpload = desktopImageValue.startsWith('/uploads/');
      const mobileIsUpload = mobileImageValue.startsWith('/uploads/');

      if (!selectedHeroSlideId && (!desktopIsUpload || !mobileIsUpload)) {
        setStatus(null, 'Please upload desktop and mobile images.');
        return;
      }

      const existingMaxOrder = heroSlides.reduce((max, s) => Math.max(max, s.order ?? 0), 0);
      const computedOrder = heroSlideForm.order && heroSlideForm.order > 0 ? heroSlideForm.order : existingMaxOrder + 1;

      // If order explicitly collides with another slide (other than the one being edited), prompt user
      const duplicateHero = heroSlides.find(
        (s) => (s.order ?? 0) === computedOrder && (!selectedHeroSlideId || s.id !== selectedHeroSlideId)
      );
      if (duplicateHero) {
        setOrderConflict({
          type: 'hero',
          order: computedOrder,
          existingTitle: duplicateHero.title,
          onConfirm: async () => {
            setOrderConflict(null);
            const payload: Partial<HeroSlidePayload> = {
              title: heroSlideForm.title,
              subtitle: heroSlideForm.subtitle,
              caption: heroSlideForm.caption,
              ctaText: heroSlideForm.ctaText,
              linkUrl: heroSlideForm.linkUrl,
              order: computedOrder,
              altText: heroSlideForm.altText,
            };

            if (!selectedHeroSlideId || desktopIsUpload) {
              payload.desktopImage = desktopImageValue;
            }
            if (!selectedHeroSlideId || mobileIsUpload) {
              payload.mobileImage = mobileImageValue;
            }
            if (selectedHeroSlideId) {
              await heroSlidesApi.update(selectedHeroSlideId, payload);
              setStatus('Hero slide updated');
            } else {
              await heroSlidesApi.create(payload as HeroSlidePayload);
              setStatus('Hero slide created');
            }
            // Move displaced hero to next available order
            const used = new Set<number>(heroSlides.map((s) => (s.order ?? 0) > 0 ? (s.order as number) : 0));
            used.add(computedOrder);
            let next = 1;
            while (used.has(next)) next++;
            await heroSlidesApi.update(duplicateHero.id, { order: next });
            await refreshHeroSlider();
            setSelectedHeroSlideId('');
          },
        });
        return;
      }

      const payload: Partial<HeroSlidePayload> = {
        title: heroSlideForm.title,
        subtitle: heroSlideForm.subtitle,
        caption: heroSlideForm.caption,
        ctaText: heroSlideForm.ctaText,
        linkUrl: heroSlideForm.linkUrl,
        order: computedOrder,
        altText: heroSlideForm.altText,
      };

      if (!selectedHeroSlideId || desktopIsUpload) {
        payload.desktopImage = desktopImageValue;
      }
      if (!selectedHeroSlideId || mobileIsUpload) {
        payload.mobileImage = mobileImageValue;
      }

      if (selectedHeroSlideId) {
        await heroSlidesApi.update(selectedHeroSlideId, payload);
        setStatus('Hero slide updated');
      } else {
        await heroSlidesApi.create(payload as HeroSlidePayload);
        setStatus('Hero slide created');
      }

      await refreshHeroSlider();
      setSelectedHeroSlideId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Hero slide operation failed');
    }
  };

  const deleteHeroSlide = async (id: string) => {
    try {
      await heroSlidesApi.delete(id);
      await refreshHeroSlider();
      setStatus('Hero slide deleted');
      setDeleteConfirmation(null);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete hero slide');
      setDeleteConfirmation(null);
    }
  };

  const submitFeaturedItem = async (orderToCheck: number) => {
    try {
      const itemsInVariant = featuredItems.filter((item) => item.variant === activeFeatureTab);
      const maxOrderInVariant = itemsInVariant.reduce((max, it) => Math.max(max, it.order ?? 0), 0);
      const finalOrder = orderToCheck && orderToCheck > 0 ? orderToCheck : maxOrderInVariant + 1;

      const imageValue = featureForm.image.trim();
      const imageIsUpload = imageValue.startsWith('/uploads/');

      const payload: Partial<FeaturedShowcasePayload> = {
        variant: activeFeatureTab,
        title: featureForm.title,
        subtitle: featureForm.subtitle,
        category: featureForm.category,
        offer: featureForm.offer,
        badgeText: featureForm.badgeText,
        ctaText: featureForm.ctaText,
        linkUrl: featureForm.linkUrl,
        price: featureForm.price,
        order: finalOrder,
        altText: featureForm.altText,
      };

      if (!selectedFeatureId || imageIsUpload) {
        payload.image = imageValue;
      }

      if (selectedFeatureId) {
        await featuredShowcaseApi.update(selectedFeatureId, payload);
        setStatus('Featured showcase updated');
      } else {
        await featuredShowcaseApi.create(payload as FeaturedShowcasePayload);
        setStatus('Featured showcase created');
      }

      await refreshFeaturedShowcase();
      setSelectedFeatureId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Featured showcase operation failed');
    }
  };

  const handleFeatureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const imageValue = featureForm.image.trim();
      if (!imageValue) {
        setStatus(null, 'Image is required.');
        return;
      }
      if (!selectedFeatureId && !imageValue.startsWith('/uploads/')) {
        setStatus(null, 'Please upload an image.');
        return;
      }

      const orderToCheck = Number(featureForm.order) || 1;
      const itemsInVariant = featuredItems.filter((item) => item.variant === activeFeatureTab);
      const duplicateOrder = itemsInVariant.find(
        (item) => item.order === orderToCheck && item.id !== selectedFeatureId
      );

      if (duplicateOrder) {
        setOrderConflict({
          type: 'featured',
          order: orderToCheck,
          existingTitle: duplicateOrder.title,
          onConfirm: async () => {
            setOrderConflict(null);
            await submitFeaturedItem(orderToCheck);
            // Move displaced item to next available order within the same variant
            const itemsInVariant2 = featuredItems.filter((item) => item.variant === activeFeatureTab);
            const used = new Set<number>(
              itemsInVariant2.map((it) => (it.order ?? 0) > 0 ? (it.order as number) : 0)
            );
            used.add(orderToCheck);
            let next = 1;
            while (used.has(next)) next++;
            await featuredShowcaseApi.update(duplicateOrder.id, { order: next });
            await refreshFeaturedShowcase();
          },
        });
        return;
      }

      await submitFeaturedItem(orderToCheck);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Featured showcase operation failed');
    }
  };

  const deleteFeaturedItem = async (id: string) => {
    try {
      await featuredShowcaseApi.delete(id);
      await refreshFeaturedShowcase();
      setStatus('Featured item deleted');
      setDeleteConfirmation(null);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete featured item');
      setDeleteConfirmation(null);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await ordersApi.updateStatus(id, status);
      await refreshOrders();
      setStatus('Order status updated');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to update order');
    }
  };

  const handleMenuSave = async (overrides?: { sectionsDraft?: MenuSectionInput[]; linksDraft?: MenuLinkInput[] }) => {
    setSavingMenu(true);
    try {
      const sectionsDraft = overrides?.sectionsDraft ?? menuSectionsDraft;
      const linksDraft = overrides?.linksDraft ?? menuLinksDraft;

      const sanitizedSections = sectionsDraft
        .filter((section) => section.name.trim())
        .map((section, sectionIndex) => ({
          id: isObjectId(section.id) ? section.id : undefined,
          name: section.name.trim(),
          icon: section.icon,
          order: typeof section.order === 'number' ? section.order : sectionIndex,
          visible: section.visible !== false,
          items: (section.items ?? [])
            .filter((item) => item.categoryId)
            .map((item, itemIndex) => ({
              id: isObjectId(item.id) ? item.id : undefined,
              categoryId: item.categoryId,
              productId: isObjectId(item.productId) ? item.productId : null,
              order: typeof item.order === 'number' ? item.order : itemIndex,
            })),
        }));

      const sanitizedLinks = linksDraft
        .filter((link) => link.label.trim() && link.href.trim())
        .slice(0, MAX_MENU_QUICK_LINKS)
        .map((link, linkIndex) => ({
          id: isObjectId(link.id) ? link.id : undefined,
          label: link.label.trim(),
          href: link.href.trim(),
          order: typeof link.order === 'number' ? link.order : linkIndex,
          visible: link.visible !== false,
        }));

      await menuApi.update({
        sections: sanitizedSections,
        links: sanitizedLinks,
        promo: { text: promoText.trim(), visible: promoVisible },
      });
      setStatus('Navigation menu updated');
      await refreshMenu();
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Navigation update failed');
    } finally {
      setSavingMenu(false);
    }
  };

  const getMenuIcon = (tabId: string) => {
    switch (tabId) {
      case 'users':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'categories':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'products':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'banners':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'navigation':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="3" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="14" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="14" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        );
      case 'homepage':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'orders':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case 'messages':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h8m-8 4h5m-8 8l4-4h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const parentLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      if (category.parentId) {
        const parentName =
          categories.find((candidate) => candidate.id === category.parentId)?.name ?? 'Parent removed';
        map.set(category.id, parentName);
      } else {
        map.set(category.id, 'Top-level');
      }
    });
    return map;
  }, [categories]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const sortedHeroSlides = useMemo(() => {
    return [...heroSlides].sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [heroSlides]);

  const featuredByVariant = useMemo(() => {
    const feature = featuredItems
      .filter((item) => item.variant === 'feature')
      .sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.title ?? '').localeCompare(b.title ?? '');
      });
    const tiles = featuredItems
      .filter((item) => item.variant === 'tile')
      .sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.title ?? '').localeCompare(b.title ?? '');
      });
    return { feature, tiles };
  }, [featuredItems]);

  const topNavItems = useMemo(
    () =>
      adminTabs.map((tab) => {
        if (tab.id === 'users') {
          const activeUsersLabel = usersSection === 'clients' ? 'Clients' : 'Staff';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'staff', label: 'Staff' },
                { id: 'clients', label: 'Clients' },
              ],
              activeId: activeTab === 'users' ? usersSection : undefined,
            },
            activeLabel: activeTab === 'users' ? activeUsersLabel : undefined,
          };
        }
        if (tab.id === 'homepage') {
          const activeHomepageLabel =
            homepageSection === 'featured' ? 'Featured highlights' :
            homepageSection === 'categorydisplay' ? 'Categories display' :
            homepageSection === 'manufacturers' ? 'Manufacturers display' : 'Hero slider';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: homepageTabs.map((child, index) => ({
                id: child.id,
                label: child.label,
                separatorAfter: index < homepageTabs.length - 1, // Add separator after each item except the last
              })),
              activeId: activeTab === 'homepage' ? homepageSection : undefined,
              groupLabel: 'Homepage',
            },
            activeLabel: activeTab === 'homepage' ? activeHomepageLabel : undefined,
          };
        }
        if (tab.id === 'categories') {
          const activeCatalogLabel =
            catalogSection === 'manufacturers' ? 'Manufacturers' :
            catalogSection === 'brands' ? 'Brands' :
            catalogSection === 'models' ? 'Models' :
            catalogSection === 'tags' ? 'Tags' : 'Categories';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'categories', label: 'Categories' },
                { id: 'manufacturers', label: 'Manufacturers' },
                { id: 'brands', label: 'Brands' },
                { id: 'models', label: 'Models' },
                { id: 'tags', label: 'Tags' },
              ],
              activeId: activeTab === 'categories' ? catalogSection : undefined,
              groupLabel: 'Catalog',
            },
            activeLabel: activeTab === 'categories' ? activeCatalogLabel : undefined,
          };
        }
        if (tab.id === 'navigation') {
          const activeNavigationLabel =
            navigationSection === 'topnav' ? 'Top nav' :
            navigationSection === 'quicklinks' ? 'Quick links' :
            navigationSection === 'visible' ? 'Visible titles' : 'Titles';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: navigationTabs.map((child, index) => ({
                id: child.id,
                label: child.label,
                separatorAfter: index === 0, // Add separator after first item (Top nav)
              })),
              activeId: activeTab === 'navigation' ? navigationSection : undefined,
              groupLabel: 'Menu',
            },
            activeLabel: activeTab === 'navigation' ? activeNavigationLabel : undefined,
          };
        }
        if (tab.id === 'products') {
          const activeProductsLabel =
            productsView === 'add'
              ? 'Add Product'
              : productsView === 'inventory'
                ? 'Inventory'
                : productsView === 'list'
                  ? 'Product list'
                  : productsView === 'coupons'
                    ? 'Coupons'
                    : productsView === 'taxes'
                      ? 'Tax rates'
                    : 'All Products';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'all', label: 'All Products' },
                { id: 'list', label: 'Product list' },
                { id: 'add', label: 'Add Product' },
                { id: 'inventory', label: 'Inventory' },
                { id: 'coupons', label: 'Coupons' },
                { id: 'taxes', label: 'Tax rates' },
              ],
              activeId: activeTab === 'products' ? productsView : undefined,
            },
            activeLabel: activeTab === 'products' ? activeProductsLabel : undefined,
          };
        }
        if (tab.id === 'orders') {
          const activeOrdersLabel = ordersSection === 'invoices' ? 'Invoices' : 'Orders';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'orders', label: 'Orders' },
                { id: 'invoices', label: 'Invoices' },
              ],
              activeId: activeTab === 'orders' ? ordersSection : undefined,
            },
            activeLabel: activeTab === 'orders' ? activeOrdersLabel : undefined,
            badgeCount: orders.filter((o) => o.status === 'pending').length,
          };
        }
        return {
          id: tab.id,
          label: tab.label,
          icon: getMenuIcon(tab.id),
          badgeCount: tab.id === 'messages' ? messagesUnreadCount : undefined,
        };
      }),
    [homepageSection, navigationSection, activeTab, catalogSection, usersSection, productsView, ordersSection, orders, messagesUnreadCount]
  );

  const handleTopNavSelect = (id: string, dropdownId?: string) => {
    if (id === 'users') {
      if (dropdownId === 'staff' || dropdownId === 'clients') {
        setUsersSection(dropdownId);
      }
      setActiveTab('users');
      return;
    }
    if (id === 'homepage') {
      if (dropdownId === 'hero' || dropdownId === 'featured' || dropdownId === 'categorydisplay' || dropdownId === 'manufacturers') {
        setHomepageSection(dropdownId);
      }
      setActiveTab('homepage');
      return;
    }

    if (id === 'categories') {
      if (dropdownId === 'categories' || dropdownId === 'manufacturers' || dropdownId === 'brands' || dropdownId === 'models' || dropdownId === 'tags') {
        setCatalogSection(dropdownId);
      }
      setActiveTab('categories');
      return;
    }

    if (id === 'navigation') {
      if (dropdownId === 'topnav' || dropdownId === 'sections' || dropdownId === 'quicklinks' || dropdownId === 'visible') {
        setNavigationSection(dropdownId);
      }
      setActiveTab('navigation');
      return;
    }

    if (id === 'products') {
      if (
        dropdownId === 'all' ||
        dropdownId === 'add' ||
        dropdownId === 'inventory' ||
        dropdownId === 'list' ||
        dropdownId === 'coupons' ||
        dropdownId === 'taxes'
      ) {
        setProductsView(dropdownId);
      }
      setActiveTab('products');
      return;
    }

    if (id === 'orders') {
      if (dropdownId === 'orders' || dropdownId === 'invoices') {
        setOrdersSection(dropdownId);
      }
      setActiveTab('orders');
      return;
    }

    if (adminTabs.some((tab) => tab.id === id)) {
      setActiveTab(id as (typeof adminTabs)[number]['id']);
    }
  };

  if (!user || !canEditOrders(user.role)) {
    return (
      <SiteLayout>
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted">
          You do not have access to the admin dashboard.
        </div>
      </SiteLayout>
    );
  }

  return (
    <AdminLayout
      topNav={<AdminTopNav items={topNavItems} activeId={activeTab} onSelect={handleTopNavSelect} />}
      contentKey={activeTab === 'users' ? `users-${usersSection}` : activeTab}
    >
      <div className="space-y-6">
        {statusMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key={`users-${usersSection}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {usersSection === 'staff' ? (
                <StaffManagementPanel
                  role={role}
                  currentUserId={user?.id ?? ''}
                  setStatus={setStatus}
                />
              ) : (
                <ClientManagementPanel
                  role={role}
                  currentUserId={user?.id ?? ''}
                  setStatus={setStatus}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'categories' && catalogSection === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CategoriesAdminSection
                categories={categories}
                parentLabelMap={parentLabelMap}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                manageForm={categoryForm}
                setManageForm={setCategoryForm}
                onManageSubmit={handleCategorySubmit}
                onDelete={(id) => {
                  setDeleteConfirmation({ type: 'category', id });
                  return Promise.resolve();
                }}
                view="manage"
                displayForm={categoryDisplayForm}
                setDisplayForm={setCategoryDisplayForm}
                onDisplaySave={handleCategoryDisplaySave}
                displaySaving={savingCategoryDisplay}
                maxHomepageCategories={MAX_HOMEPAGE_CATEGORIES}
              />
            </motion.div>
          )}
          {activeTab === 'categories' && catalogSection === 'manufacturers' && (
            <motion.div
              key="manufacturers-manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ManufacturersAdminSection
                onOrderConflict={(order, existingTitle, onConfirm) =>
                  setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })
                }
                setStatus={setStatus}
              />
            </motion.div>
          )}
          {activeTab === 'categories' && catalogSection === 'brands' && (
            <motion.div
              key="brands-manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <BrandsAdminSection
                onOrderConflict={(order, existingTitle, onConfirm) =>
                  setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })
                }
                setStatus={setStatus}
              />
            </motion.div>
          )}
          {activeTab === 'categories' && catalogSection === 'models' && (
            <motion.div
              key="models-manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ModelsAdminSection
                onOrderConflict={(order, existingTitle, onConfirm) =>
                  setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })
                }
                setStatus={setStatus}
              />
            </motion.div>
          )}
          {activeTab === 'categories' && catalogSection === 'tags' && (
            <motion.div
              key="tags-manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <TagsAdminSection
                onOrderConflict={(order, existingTitle, onConfirm) =>
                  setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })
                }
                setStatus={setStatus}
              />
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key={`products-${productsView}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {productsView === 'inventory' ? (
                <ProductInventoryAdminSection
                  products={products}
                  onRefresh={refreshProducts}
                  setStatus={setStatus}
                  onOpenProduct={(id) => {
                    setSelectedProductId(id);
                    setProductsView('all');
                  }}
                />
              ) : productsView === 'list' ? (
                <ProductReviewsAdminSection
                  products={products}
                  categories={categories}
                  manufacturers={manufacturers}
                  orders={orders}
                  onRefresh={refreshProducts}
                  setStatus={setStatus}
                />
              ) : productsView === 'coupons' ? (
                <CouponsAdminSection
                  categories={categories}
                  products={products}
                  setStatus={setStatus}
                />
              ) : productsView === 'taxes' ? (
                <TaxRatesAdminSection setStatus={setStatus} />
              ) : (
                <ProductsAdminSection
                  key={`products-${productsView}-${selectedProductId || 'new'}`}
                  products={products}
                  categories={categories}
                  categoryNameById={categoryNameById}
                  selectedProductId={selectedProductId}
                  onSelectProduct={setSelectedProductId}
                  form={productForm}
                  setForm={setProductForm}
                  onSubmit={handleProductSubmit}
                  onDelete={(id) => {
                    setDeleteConfirmation({ type: 'product', id });
                    return Promise.resolve();
                  }}
                  onBulkDelete={(ids) => {
                    setDeleteConfirmation({ type: 'products-bulk', ids });
                    return Promise.resolve();
                  }}
                  onRefreshProducts={refreshProducts}
                  view={productsView}
                  onViewChange={setProductsView}
                  manufacturers={manufacturers}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <MessagesAdminSection
                setStatus={setStatus}
                composeRequest={composeRequest}
                onComposeRequestHandled={() => setComposeRequest(null)}
              />
            </motion.div>
          )}

          {activeTab === 'navigation' && (
            <motion.div
              key="navigation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <NavigationAdminSection
                section={navigationSection}
                sections={menuSectionsDraft}
                links={menuLinksDraft}
                promoText={promoText}
                promoVisible={promoVisible}
                setSections={setMenuSectionsDraft}
                setLinks={setMenuLinksDraft}
                setPromoText={setPromoText}
                setPromoVisible={setPromoVisible}
                categories={categories}
                products={products}
                onSave={handleMenuSave}
                saving={savingMenu}
                canEdit={canEditHomepage(role)}
                onRequestDeleteSection={(index) => setDeleteConfirmation({ type: 'menu-section', id: String(index) })}
                onRequestDeleteLink={(index) => setDeleteConfirmation({ type: 'menu-link', id: String(index) })}
                onOrderConflict={(order, existingTitle, onConfirm) => setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })}
              />
            </motion.div>
          )}

          {activeTab === 'homepage' && (
            <motion.div
              key="homepage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {(homepageSection === 'hero' || homepageSection === 'featured') && (
                <HomepageAdminSection
                  section={homepageSection}
                  onSectionChange={setHomepageSection}
                  sortedHeroSlides={sortedHeroSlides}
                  selectedHeroSlideId={selectedHeroSlideId}
                  onSelectHeroSlide={setSelectedHeroSlideId}
                  heroForm={heroSlideForm}
                  setHeroForm={setHeroSlideForm}
                  onHeroSubmit={handleHeroSubmit}
                  requestDeleteHero={(id) => setDeleteConfirmation({ type: 'hero', id })}
                  canEditHomepage={canEditHomepage(role)}
                  canDeleteHomepage={canDeleteHomepage(role)}
                  featuredByVariant={featuredByVariant}
                  activeFeatureTab={activeFeatureTab}
                  onFeatureTabChange={(tab) => {
                    setActiveFeatureTab(tab);
                    setSelectedFeatureId('');
                  }}
                  selectedFeatureId={selectedFeatureId}
                  onSelectFeature={setSelectedFeatureId}
                  featureForm={featureForm}
                  setFeatureForm={setFeatureForm}
                  onFeatureSubmit={handleFeatureSubmit}
                  requestDeleteFeatured={(id) => setDeleteConfirmation({ type: 'featured', id })}
                  orderConflict={orderConflict}
                  setOrderConflict={setOrderConflict}
                  setStatus={setStatus}
                  maxImageBytes={MAX_IMAGE_BYTES}
                />
              )}
              {homepageSection === 'categorydisplay' && (
                <CategoriesAdminSection
                  categories={categories}
                  parentLabelMap={parentLabelMap}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  manageForm={categoryForm}
                  setManageForm={setCategoryForm}
                  onManageSubmit={handleCategorySubmit}
                  onDelete={deleteCategory}
                  view="display"
                  displayForm={categoryDisplayForm}
                  setDisplayForm={setCategoryDisplayForm}
                  onDisplaySave={handleCategoryDisplaySave}
                  displaySaving={savingCategoryDisplay}
                  maxHomepageCategories={MAX_HOMEPAGE_CATEGORIES}
                  onOrderConflict={(order: number, existingTitle: string, onConfirm: () => void) =>
                    setOrderConflict({ type: 'categorydisplay', order, existingTitle, onConfirm })
                  }
                />
              )}
              {homepageSection === 'manufacturers' && (
                <ManufacturersDisplayAdminSection
                  maxHomepageManufacturers={MAX_HOMEPAGE_CATEGORIES}
                  onOrderConflict={(order, existingTitle, onConfirm) =>
                    setOrderConflict({ type: 'featured', order, existingTitle, onConfirm })
                  }
                  setStatus={setStatus}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key={`orders-${ordersSection}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {ordersSection === 'orders' ? (
                <OrdersAdminSection
                  orders={orders}
                  canEditOrders={canEditOrders(role)}
                  orderStatuses={orderStatuses}
                  onUpdateStatus={updateOrderStatus}
                  onRefresh={refreshOrders}
                />
              ) : (
                <InvoicesAdminSection />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {orderConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Order Conflict</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Order <strong>{orderConflict.order}</strong> is already used by <strong>"{orderConflict.existingTitle}"</strong>.
                  Continuing will replace it and may affect display order.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrderConflict(null)}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = orderConflict.onConfirm;
                  setOrderConflict(null);
                  fn();
                }}
                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-600/20"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {deleteConfirmation.type === 'hero' && 'Are you sure you want to delete this hero slide?'}
                  {deleteConfirmation.type === 'featured' && 'Are you sure you want to delete this featured item?'}
                  {deleteConfirmation.type === 'category' && 'Are you sure you want to delete this category?'}
                  {deleteConfirmation.type === 'product' && 'Are you sure you want to delete this product?'}
                  {deleteConfirmation.type === 'products-bulk' && `Are you sure you want to delete ${deleteConfirmation.ids.length} products?`}
                  {(deleteConfirmation.type === 'menu-section' || deleteConfirmation.type === 'menu-link') && 'Remove this item from navigation?'}
                </p>
                <p className="mt-2 text-sm font-semibold text-red-600">⚠️ This is a hard delete and cannot be recovered.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = deleteConfirmation.type;
                  if (t === 'hero') {
                    void deleteHeroSlide(deleteConfirmation.id);
                  } else if (t === 'featured') {
                    void deleteFeaturedItem(deleteConfirmation.id);
                  } else if (t === 'category') {
                    void deleteCategory(deleteConfirmation.id);
                  } else if (t === 'product') {
                    void deleteProduct(deleteConfirmation.id);
                  } else if (t === 'products-bulk') {
                    void deleteBulkProducts(deleteConfirmation.ids);
                  } else if (t === 'menu-section') {
                    const index = Number(deleteConfirmation.id);
                    const nextSectionsDraft = menuSectionsDraft.filter((_, i) => i !== index);
                    setMenuSectionsDraft(nextSectionsDraft);
                    void handleMenuSave({ sectionsDraft: nextSectionsDraft });
                  } else if (t === 'menu-link') {
                    const index = Number(deleteConfirmation.id);
                    const nextLinksDraft = menuLinksDraft.filter((_, i) => i !== index);
                    setMenuLinksDraft(nextLinksDraft);
                    void handleMenuSave({ linksDraft: nextLinksDraft });
                  }
                  setDeleteConfirmation(null);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
