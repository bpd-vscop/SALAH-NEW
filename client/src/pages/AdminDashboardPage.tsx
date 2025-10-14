import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
import { featuredShowcaseApi, type FeaturedShowcaseItem, type FeaturedVariant } from '../api/featuredShowcase';
import { heroSlidesApi, type HeroSlide } from '../api/heroSlides';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { usersApi } from '../api/users';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import type {
  Banner,
  BannerType,
  Category,
  Order,
  OrderStatus,
  Product,
  ProductTag,
  User,
  UserRole,
} from '../types/api';
import { StatusPill } from '../components/common/StatusPill';
import { formatCurrency, formatTimestamp } from '../utils/format';
import { cn } from '../utils/cn';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Unsupported file result'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const adminTabs = [
  { id: 'users', label: 'Users' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'banners', label: 'Banners' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'orders', label: 'Orders' },
] as const;

const homepageTabs = [
  { id: 'hero' as const, label: 'Hero slider' },
  { id: 'featured' as const, label: 'Featured highlights' },
];

const featureManagementTabs = [
  { id: 'feature' as const, label: 'Feature cards' },
  { id: 'tile' as const, label: 'Tile cards' },
];

const emptyFeatureForm = (variant: FeaturedVariant) => ({
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

const productTags: ProductTag[] = ['in stock', 'out of stock', 'on sale', 'available to order'];
const bannerTypes: BannerType[] = ['slide', 'row', 'advertising'];
const orderStatuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const canManageUsers = (role: UserRole) => role === 'admin';
const canEditUsers = (role: UserRole) => role === 'admin' || role === 'manager';
const canEditOrders = (role: UserRole) => role === 'admin' || role === 'manager' || role === 'staff';
const canEditHomepage = (role: UserRole) => role === 'admin' || role === 'manager' || role === 'staff';
const canDeleteHomepage = (role: UserRole) => role === 'admin' || role === 'manager';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedShowcaseItem[]>([]);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    role: 'client' as UserRole,
    status: 'active' as User['status'],
    password: '',
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryForm, setCategoryForm] = useState({ name: '', parentId: '' });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    price: 0,
    tags: new Set<ProductTag>(),
    description: '',
    images: '',
  });

  const [selectedBannerId, setSelectedBannerId] = useState<string>('');
  const [bannerForm, setBannerForm] = useState({
    type: 'slide' as BannerType,
    imageUrl: '',
    text: '',
    linkUrl: '',
    order: 0,
    isActive: true,
  });

  const [selectedHeroSlideId, setSelectedHeroSlideId] = useState<string>('');
  const [heroSlideForm, setHeroSlideForm] = useState({
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
const [featureForm, setFeatureForm] = useState(() => emptyFeatureForm('feature'));

  const [homepageSection, setHomepageSection] = useState<'hero' | 'featured'>('hero');
  const [homepageExpanded, setHomepageExpanded] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'feature' | 'tile'>('feature');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'hero' | 'featured'; id: string } | null>(null);
  const [orderConflict, setOrderConflict] = useState<{ type: 'hero' | 'featured'; order: number; existingTitle: string; onConfirm: () => void } | null>(null);

  const refreshUsers = async () => {
    const { users: data } = await usersApi.list();
    setUsers(data);
  };

  const refreshCategories = async () => {
    const { categories: data } = await categoriesApi.list();
    setCategories(data);
  };

  const refreshProducts = async () => {
    const { products: data } = await productsApi.list();
    setProducts(data);
  };

  const refreshBanners = async () => {
    const { banners: data } = await bannersApi.list();
    setBanners(data);
  };

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

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        await Promise.all([
          refreshUsers(),
          refreshCategories(),
          refreshProducts(),
          refreshBanners(),
          refreshHeroSlider(),
          refreshFeaturedShowcase(),
          refreshOrders(),
        ]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, []);

  useEffect(() => {
    if (activeTab !== 'homepage') {
      setHomepageSection('hero');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedUserId) {
      setUserForm({ name: '', username: '', role: 'client', status: 'active', password: '' });
      return;
    }

    const existing = users.find((candidate) => candidate.id === selectedUserId);
    if (existing) {
      setUserForm({
        name: existing.name,
        username: existing.username,
        role: existing.role,
        status: existing.status,
        password: '',
      });
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setCategoryForm({ name: '', parentId: '' });
      return;
    }

    const existing = categories.find((category) => category.id === selectedCategoryId);
    if (existing) {
      setCategoryForm({ name: existing.name, parentId: existing.parentId ?? '' });
    }
  }, [selectedCategoryId, categories]);

  useEffect(() => {
    if (!selectedProductId) {
      setProductForm({
        name: '',
        categoryId: '',
        price: 0,
        tags: new Set<ProductTag>(),
        description: '',
        images: '',
      });
      return;
    }

    const existing = products.find((product) => product.id === selectedProductId);
    if (existing) {
      setProductForm({
        name: existing.name,
        categoryId: existing.categoryId,
        price: existing.price ?? 0,
        tags: new Set<ProductTag>(existing.tags),
        description: existing.description,
        images: existing.images.join(', '),
      });
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (!selectedBannerId) {
      setBannerForm({ type: 'slide', imageUrl: '', text: '', linkUrl: '', order: 0, isActive: true });
      return;
    }

    const existing = banners.find((banner) => banner.id === selectedBannerId);
    if (existing) {
      setBannerForm({
        type: existing.type,
        imageUrl: existing.imageUrl,
        text: existing.text ?? '',
        linkUrl: existing.linkUrl ?? '',
        order: existing.order ?? 0,
        isActive: existing.isActive ?? true,
      });
    }
  }, [selectedBannerId, banners]);

  useEffect(() => {
    if (!selectedHeroSlideId) {
      setHeroSlideForm({
        title: '',
        subtitle: '',
        caption: '',
        ctaText: 'Shop Now',
        linkUrl: '',
        order: heroSlides.length,
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
      setFeatureForm(emptyFeatureForm(activeFeatureTab));
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
    if (!selectedFeatureId) {
      const count = featuredItems.filter((item) => item.variant === activeFeatureTab).length;
      setFeatureForm({ ...emptyFeatureForm(activeFeatureTab), order: count });
    }
  }, [activeFeatureTab, selectedFeatureId, featuredItems]);

  useEffect(() => {
    if (homepageSection !== 'featured') {
      setActiveFeatureTab('feature');
      setSelectedFeatureId('');
    }
  }, [homepageSection]);

  const setStatus = (message: string | null, errorMessage: string | null = null) => {
    setStatusMessage(message);
    setError(errorMessage);
    if (message) {
      window.setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    try {
      if (selectedUserId) {
        await usersApi.update(selectedUserId, {
          name: userForm.name,
          username: userForm.username,
          role: userForm.role,
          status: userForm.status,
          ...(userForm.password ? { password: userForm.password } : {}),
        });
        setStatus('User updated');
      } else {
        await usersApi.create({
          name: userForm.name,
          username: userForm.username,
          role: userForm.role,
          status: userForm.status,
          password: userForm.password,
        });
        setStatus('User created');
      }
      await refreshUsers();
      setSelectedUserId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'User operation failed');
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        name: categoryForm.name,
        parentId: categoryForm.parentId || null,
      };

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

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        name: productForm.name,
        categoryId: productForm.categoryId,
        price: Number(productForm.price) || 0,
        description: productForm.description,
        tags: Array.from(productForm.tags),
        images: productForm.images
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean),
      };

      if (selectedProductId) {
        await productsApi.update(selectedProductId, payload);
        setStatus('Product updated');
      } else {
        await productsApi.create(payload);
        setStatus('Product created');
      }
      await refreshProducts();
      setSelectedProductId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Product operation failed');
    }
  };

  const handleBannerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        type: bannerForm.type,
        imageUrl: bannerForm.imageUrl,
        text: bannerForm.text || null,
        linkUrl: bannerForm.linkUrl || null,
        order: Number(bannerForm.order) || 0,
        isActive: bannerForm.isActive,
      };

      if (selectedBannerId) {
        await bannersApi.update(selectedBannerId, payload);
        setStatus('Banner updated');
      } else {
        await bannersApi.create(payload as Banner);
        setStatus('Banner created');
      }
      await refreshBanners();
      setSelectedBannerId('');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Banner operation failed');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await usersApi.delete(id);
      await refreshUsers();
      setStatus('User deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete user');
    }
  };

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

  const toggleProductTag = (tag: ProductTag) => {
    setProductForm((state) => {
      const nextTags = new Set(state.tags);
      if (nextTags.has(tag)) {
        nextTags.delete(tag);
      } else {
        nextTags.add(tag);
      }
      return { ...state, tags: nextTags };
    });
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(id);
      await refreshProducts();
      setStatus('Product deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete product');
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      await bannersApi.delete(id);
      await refreshBanners();
      setStatus('Banner deleted');
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Unable to delete banner');
    }
  };

  const handleHeroSlideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!heroSlideForm.desktopImage || !heroSlideForm.mobileImage) {
        setStatus(null, 'Desktop and mobile images are required');
        return;
      }

      // Check for duplicate order
      const orderToCheck = Number(heroSlideForm.order) || 1;
      const duplicateOrder = heroSlides.find(
        (slide) => slide.order === orderToCheck && slide.id !== selectedHeroSlideId
      );

      if (duplicateOrder) {
        setOrderConflict({
          type: 'hero',
          order: orderToCheck,
          existingTitle: duplicateOrder.title,
          onConfirm: async () => {
            setOrderConflict(null);
            await submitHeroSlide(orderToCheck);
          },
        });
        return;
      }

      await submitHeroSlide(orderToCheck);
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Hero slide operation failed');
    }
  };

  const submitHeroSlide = async (orderToCheck: number) => {
    try {
      const payload = {
        title: heroSlideForm.title,
        subtitle: heroSlideForm.subtitle,
        caption: heroSlideForm.caption,
        ctaText: heroSlideForm.ctaText,
        linkUrl: heroSlideForm.linkUrl,
        order: orderToCheck,
        desktopImage: heroSlideForm.desktopImage,
        mobileImage: heroSlideForm.mobileImage,
        altText: heroSlideForm.altText,
      };

      if (selectedHeroSlideId) {
        await heroSlidesApi.update(selectedHeroSlideId, payload);
        setStatus('Hero slide updated');
      } else {
        await heroSlidesApi.create(payload);
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

  const handleFeatureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!featureForm.image) {
        setStatus(null, 'Image is required');
        return;
      }

      // Check for duplicate order within the same variant
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

  const submitFeaturedItem = async (orderToCheck: number) => {
    try {
      const payload = {
        variant: activeFeatureTab,
        title: featureForm.title,
        subtitle: featureForm.subtitle,
        category: featureForm.category,
        offer: featureForm.offer,
        badgeText: featureForm.badgeText,
        ctaText: featureForm.ctaText,
        linkUrl: featureForm.linkUrl,
        price: featureForm.price,
        order: orderToCheck,
        image: featureForm.image,
        altText: featureForm.altText,
      };

      if (selectedFeatureId) {
        await featuredShowcaseApi.update(selectedFeatureId, payload);
        setStatus('Featured showcase updated');
      } else {
        await featuredShowcaseApi.create(payload);
        setStatus('Featured showcase created');
      }

      await refreshFeaturedShowcase();
      setSelectedFeatureId('');
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

  const dashboardTitle = user?.role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard';

  const sidebar = (
    <nav className="flex flex-col gap-2 text-sm">
      {adminTabs.map((tab) => {
        if (tab.id === 'homepage') {
          const expanded = homepageExpanded || activeTab === 'homepage';
          return (
            <div key={tab.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setHomepageExpanded((prev) => !prev)}
                className={cn(
                  'flex items-center justify-between rounded-xl px-4 py-2 text-left font-medium transition',
                  activeTab === 'homepage'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                )}
              >
                <span>{tab.label}</span>
                <svg
                  className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-90' : '')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {expanded && (
                <div className="ml-4 flex flex-col gap-1">
                  {homepageTabs.map((child) => {
                    const selected = homepageSection === child.id && activeTab === 'homepage';
                    return (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => {
                          setHomepageExpanded(true);
                          setActiveTab('homepage');
                          setHomepageSection(child.id);
                          setSelectedFeatureId('');
                          if (child.id === 'featured') {
                            setActiveFeatureTab('feature');
                          }
                        }}
                        className={cn(
                          'rounded-lg px-3 py-2 text-left text-xs font-medium transition',
                          selected
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-500 hover:bg-primary/5 hover:text-primary'
                        )}
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-xl px-4 py-2 text-left font-medium transition',
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

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

  const tagTone = (tag: ProductTag): 'default' | 'positive' | 'warning' | 'critical' => {
    if (tag === 'in stock') return 'positive';
    if (tag === 'out of stock') return 'critical';
    if (tag === 'on sale') return 'warning';
    return 'default';
  };

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

  const renderHomepage = () => (
    <div className="space-y-6">
      {homepageSection === 'hero' ? (
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-900">Hero Slider</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                <span className="flex items-center gap-2">
                  Slides
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                    {sortedHeroSlides.length}/5
                  </span>
                </span>
              </span>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              {sortedHeroSlides.map((slide) => (
                <article
                  key={slide.id}
                  className={cn(
                    'rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                    selectedHeroSlideId === slide.id && 'border-primary bg-white shadow-md'
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row">
                    <img
                      src={slide.desktopImage}
                      alt={slide.altText || slide.title}
                      className="h-32 w-full rounded-xl object-cover md:w-48"
                    />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{slide.title}</h3>
                          <p className="text-xs text-muted">Order {slide.order}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          Desktop &amp; mobile
                        </span>
                      </div>
                      {slide.subtitle && <p className="text-sm text-slate-700">{slide.subtitle}</p>}
                      <div className="mt-auto flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                          onClick={() => setSelectedHeroSlideId(slide.id)}
                        >
                          Edit
                        </button>
                        {canDeleteHomepage(user?.role ?? 'client') && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            onClick={() => setDeleteConfirmation({ type: 'hero', id: slide.id })}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!sortedHeroSlides.length && (
                <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                  No hero slides yet. Upload artwork to get started.
                </p>
              )}
            </div>
            <form
              className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
              onSubmit={handleHeroSlideSubmit}
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedHeroSlideId ? 'Update hero slide' : 'Create hero slide'}
                </h3>
                <p className="text-xs text-muted">Images are stored as base64 and limited to the five most recent uploads.</p>
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Title
                <input
                  type="text"
                  value={heroSlideForm.title}
                  onChange={(event) => setHeroSlideForm((state) => ({ ...state, title: event.target.value }))}
                  required
                  placeholder="Enter slide title"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Subtitle
                <input
                  type="text"
                  value={heroSlideForm.subtitle}
                  onChange={(event) => setHeroSlideForm((state) => ({ ...state, subtitle: event.target.value }))}
                  placeholder="Enter subtitle (optional)"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Caption
                <textarea
                  value={heroSlideForm.caption}
                  onChange={(event) => setHeroSlideForm((state) => ({ ...state, caption: event.target.value }))}
                  rows={3}
                  placeholder="Enter caption text (optional)"
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  CTA label
                  <input
                    type="text"
                    value={heroSlideForm.ctaText}
                    onChange={(event) => setHeroSlideForm((state) => ({ ...state, ctaText: event.target.value }))}
                    placeholder="Shop Now"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Alt text
                  <input
                    type="text"
                    value={heroSlideForm.altText}
                    onChange={(event) => setHeroSlideForm((state) => ({ ...state, altText: event.target.value }))}
                    placeholder="Image description"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Link URL
                <input
                  type="text"
                  value={heroSlideForm.linkUrl}
                  onChange={(event) => setHeroSlideForm((state) => ({ ...state, linkUrl: event.target.value }))}
                  required
                  placeholder="/products or https://example.com"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Display order
                <input
                  type="number"
                  min={1}
                  value={heroSlideForm.order}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setHeroSlideForm((state) => ({ ...state, order: value > 0 ? value : 1 }));
                  }}
                  placeholder="1"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-900">Content</h4>
                <span className="text-xs text-muted">Max file size 5 MB</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="text-xs text-muted">desktop - ar 21:9</span>
                  <label
                    className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      heroSlideForm.desktopImage
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : 'border-red-200 bg-red-100 text-red-700'
                    }`}
                  >
                    <span>{heroSlideForm.desktopImage ? 'Replace image' : 'Upload image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          if (file.size > MAX_IMAGE_BYTES) {
                            setStatus(null, 'Desktop image must be 5 MB or smaller.');
                            event.target.value = '';
                            return;
                          }
                          const dataUrl = await fileToDataUrl(file);
                          setHeroSlideForm((state) => ({ ...state, desktopImage: dataUrl }));
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                  {heroSlideForm.desktopImage && (
                    <img
                      src={heroSlideForm.desktopImage}
                      alt="Desktop preview"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="text-xs text-muted">mobile - ar 4:3</span>
                  <label
                    className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      heroSlideForm.mobileImage
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : 'border-red-200 bg-red-100 text-red-700'
                    }`}
                  >
                    <span>{heroSlideForm.mobileImage ? 'Replace image' : 'Upload image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          if (file.size > MAX_IMAGE_BYTES) {
                            setStatus(null, 'Mobile image must be 5 MB or smaller.');
                            event.target.value = '';
                            return;
                          }
                          const dataUrl = await fileToDataUrl(file);
                          setHeroSlideForm((state) => ({ ...state, mobileImage: dataUrl }));
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                  {heroSlideForm.mobileImage && (
                    <img
                      src={heroSlideForm.mobileImage}
                      alt="Mobile preview"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  )}
                </div>
              </div>
              {/* Order Conflict Warning */}
              {orderConflict && orderConflict.type === 'hero' && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-md">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900">Order Conflict</h4>
                      <p className="mt-1 text-sm text-amber-800">
                        Order {orderConflict.order} is already used by "{orderConflict.existingTitle}". Do you want to continue? This may affect the display order.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderConflict(null)}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => orderConflict.onConfirm()}
                      className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!canEditHomepage(user?.role ?? 'client')}
                >
                  {selectedHeroSlideId ? 'Save changes' : 'Create slide'}
                </button>
                {selectedHeroSlideId && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                    onClick={() => setSelectedHeroSlideId('')}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-900">Featured Showcase</h2>
            <div className="flex flex-wrap items-center gap-2">
              {featureManagementTabs.map((tab) => {
                const selected = activeFeatureTab === tab.id;
                const count = tab.id === 'feature' ? featuredByVariant.feature.length : featuredByVariant.tiles.length;
                const max = tab.id === 'feature' ? 3 : 4;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      setSelectedFeatureId('');
                      setActiveFeatureTab(tab.id);
                    }}
                    className={cn(
                      'group relative rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-300',
                      selected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-border text-slate-600 hover:bg-primary/10 hover:text-primary'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {tab.label}
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[0.65rem] font-bold transition-all duration-300',
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-primary/20 group-hover:text-primary'
                      )}>
                        {count}/{max}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              {activeFeatureTab === 'feature' ? (
                <>
                  {featuredByVariant.feature.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        'rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                        selectedFeatureId === item.id && 'border-primary bg-white shadow-md'
                      )}
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <img
                          src={item.image}
                          alt={item.altText || item.title}
                          className="h-32 w-full rounded-xl object-cover md:w-48"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                              <p className="text-xs text-muted">Order {item.order}</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              Feature card
                            </span>
                          </div>
                          {item.subtitle && <p className="text-sm text-slate-700">{item.subtitle}</p>}
                          {item.offer && <p className="text-xs font-semibold text-primary">Offer: {item.offer}</p>}
                          <div className="mt-auto flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                              onClick={() => setSelectedFeatureId(item.id)}
                            >
                              Edit
                            </button>
                            {canDeleteHomepage(user?.role ?? 'client') && (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                onClick={() => setDeleteConfirmation({ type: 'featured', id: item.id })}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!featuredByVariant.feature.length && (
                    <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                      No feature cards yet.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {featuredByVariant.tiles.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        'rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-primary hover:shadow-md',
                        selectedFeatureId === item.id && 'border-primary bg-white shadow-md'
                      )}
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <img
                          src={item.image}
                          alt={item.altText || item.title}
                          className="h-32 w-full rounded-xl object-cover md:w-48"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                              <p className="text-xs text-muted">Order {item.order}</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              Tile card
                            </span>
                          </div>
                          {item.category && <p className="text-xs text-muted">Category: {item.category}</p>}
                          {item.offer && <p className="text-xs font-semibold text-primary">Offer: {item.offer}</p>}
                          {item.badgeText && <p className="text-xs text-muted">Badge: {item.badgeText}</p>}
                          <div className="mt-auto flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                              onClick={() => setSelectedFeatureId(item.id)}
                            >
                              Edit
                            </button>
                            {canDeleteHomepage(user?.role ?? 'client') && (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                onClick={() => setDeleteConfirmation({ type: 'featured', id: item.id })}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!featuredByVariant.tiles.length && (
                    <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                      No tile cards yet.
                    </p>
                  )}
                </>
              )}
            </div>

            <form
              className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
              onSubmit={handleFeatureSubmit}
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedFeatureId ? 'Update featured item' : 'Create featured item'}
                </h3>
                <p className="text-xs text-muted">Uploads are stored as base64. The last three per variant are kept.</p>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Managing: {activeFeatureTab === 'feature' ? 'Feature cards' : 'Tile cards'}
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Title
                <input
                  type="text"
                  value={featureForm.title}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, title: event.target.value }))}
                  required
                  placeholder="Enter product title"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Subtitle
                <input
                  type="text"
                  value={featureForm.subtitle}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, subtitle: event.target.value }))}
                  placeholder="Enter subtitle (optional)"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Category label
                  <input
                    type="text"
                    value={featureForm.category}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, category: event.target.value }))}
                    placeholder="e.g., New Arrival"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Offer text
                  <input
                    type="text"
                    value={featureForm.offer}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, offer: event.target.value }))}
                    placeholder="e.g., 50% OFF"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Badge text
                  <input
                    type="text"
                    value={featureForm.badgeText}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, badgeText: event.target.value }))}
                    placeholder="e.g., NEW"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  CTA label
                  <input
                    type="text"
                    value={featureForm.ctaText}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, ctaText: event.target.value }))}
                    placeholder="Shop Now"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Link URL
                  <input
                    type="text"
                    value={featureForm.linkUrl}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, linkUrl: event.target.value }))}
                    required
                    placeholder="/products or https://example.com"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Price text
                  <input
                    type="text"
                    value={featureForm.price}
                    onChange={(event) => setFeatureForm((state) => ({ ...state, price: event.target.value }))}
                    placeholder="e.g., $49.99"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Alt text
                <input
                  type="text"
                  value={featureForm.altText}
                  onChange={(event) => setFeatureForm((state) => ({ ...state, altText: event.target.value }))}
                  placeholder="Image description"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Display order
                <input
                  type="number"
                  min={1}
                  value={featureForm.order}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setFeatureForm((state) => ({ ...state, order: value > 0 ? value : 1 }));
                  }}
                  placeholder="1"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="flex items-center justify-between text-sm text-slate-900">
                <span className="font-semibold uppercase tracking-wide">Content</span>
                <span className="text-xs text-muted">Max file size 5 MB</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <label
                  className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                    featureForm.image
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-red-200 bg-red-100 text-red-700'
                  }`}
                >
                  <span>{featureForm.image ? 'Replace image' : 'Upload image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        if (file.size > MAX_IMAGE_BYTES) {
                          setStatus(null, 'Image must be 5 MB or smaller.');
                          event.target.value = '';
                          return;
                        }
                        const dataUrl = await fileToDataUrl(file);
                        setFeatureForm((state) => ({ ...state, image: dataUrl }));
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                {featureForm.image && (
                  <img src={featureForm.image} alt="Feature preview" className="h-32 w-full rounded-xl object-cover" />
                )}
              </div>
              {/* Order Conflict Warning */}
              {orderConflict && orderConflict.type === 'featured' && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-md">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900">Order Conflict</h4>
                      <p className="mt-1 text-sm text-amber-800">
                        Order {orderConflict.order} is already used by "{orderConflict.existingTitle}". Do you want to continue? This may affect the display order.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderConflict(null)}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => orderConflict.onConfirm()}
                      className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!canEditHomepage(user?.role ?? 'client')}
                >
                  {selectedFeatureId ? 'Save changes' : 'Create item'}
                </button>
                {selectedFeatureId && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                    onClick={() => setSelectedFeatureId('')}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
  const renderUsers = () => (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">User management</h2>
          <p className="text-sm text-muted">Invite teammates and control access.</p>
        </div>
        {loading && <span className="text-xs text-muted">Loading data...</span>}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {users.map((record) => (
                <tr key={record.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3 font-medium text-slate-900">{record.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.username}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">{record.role}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={record.status}
                      tone={record.status === 'active' ? 'positive' : 'critical'}
                    />
                  </td>
                  <td className="flex items-center justify-end gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      onClick={() => setSelectedUserId(record.id)}
                    >
                      Edit
                    </button>
                    {canManageUsers(user?.role ?? 'client') && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        onClick={() => deleteUser(record.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={handleUserSubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedUserId ? 'Update user' : 'Create user'}
              </h3>
              <p className="text-xs text-muted">Set role and credentials.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Name
              <input
                type="text"
                value={userForm.name}
                onChange={(event) => setUserForm((state) => ({ ...state, name: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Username
              <input
                type="text"
                value={userForm.username}
                onChange={(event) => setUserForm((state) => ({ ...state, username: event.target.value }))}
                pattern="[a-z0-9._-]{3,30}"
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Role
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((state) => ({ ...state, role: event.target.value as UserRole }))}
                disabled={!canEditUsers(user?.role ?? 'client')}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="client">Client</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Status
              <select
                value={userForm.status}
                onChange={(event) => setUserForm((state) => ({ ...state, status: event.target.value as User['status'] }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Password {selectedUserId ? '(leave blank to keep current)' : ''}
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((state) => ({ ...state, password: event.target.value }))}
                minLength={selectedUserId ? 0 : 8}
                required={!selectedUserId}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!canEditUsers(user?.role ?? 'client')}
            >
              {selectedUserId ? 'Save changes' : 'Create user'}
            </button>
            {selectedUserId && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                onClick={() => setSelectedUserId('')}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderCategories = () => (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
          <p className="text-sm text-muted">Organize products into logical groups.</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Parent</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{parentLabelMap.get(category.id)}</td>
                  <td className="flex items-center justify-end gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      onClick={() => deleteCategory(category.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!categories.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={handleCategorySubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedCategoryId ? 'Update category' : 'Create category'}
              </h3>
              <p className="text-xs text-muted">Nest categories to build hierarchies.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Name
              <input
                type="text"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((state) => ({ ...state, name: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Parent category
              <select
                value={categoryForm.parentId}
                onChange={(event) => setCategoryForm((state) => ({ ...state, parentId: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Top-level</option>
                {categories
                  .filter((category) => category.id !== selectedCategoryId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              {selectedCategoryId ? 'Save changes' : 'Create category'}
            </button>
            {selectedCategoryId && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                onClick={() => setSelectedCategoryId('')}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderProducts = () => (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-muted">Add and maintain catalog items.</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {products.map((product) => (
            <article
              key={product.id}
              className={cn(
                'rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary hover:shadow-md',
                selectedProductId === product.id && 'border-primary bg-white shadow-md'
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                    <p className="text-xs text-muted">
                      {categoryNameById.get(product.categoryId) ?? 'Unassigned'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(product.price ?? 0)}
                  </span>
                </div>
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <StatusPill key={tag} label={tag} tone={tagTone(tag)} />
                    ))}
                  </div>
                )}
                {product.description && (
                  <p className="text-sm text-slate-600">{product.description}</p>
                )}
                {product.images.length > 0 && (
                  <p className="text-xs text-muted">
                    Images: {product.images.length} file{product.images.length === 1 ? '' : 's'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    onClick={() => deleteProduct(product.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!products.length && (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No products yet.
            </div>
          )}
        </div>
        <div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={handleProductSubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedProductId ? 'Update product' : 'Create product'}
              </h3>
              <p className="text-xs text-muted">Provide pricing, descriptions, and imagery.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Name
              <input
                type="text"
                value={productForm.name}
                onChange={(event) => setProductForm((state) => ({ ...state, name: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Category
              <select
                value={productForm.categoryId}
                onChange={(event) => setProductForm((state) => ({ ...state, categoryId: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={productForm.price}
                onChange={(event) => setProductForm((state) => ({ ...state, price: Number(event.target.value) }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Description
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((state) => ({ ...state, description: event.target.value }))}
                rows={4}
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              Tags
              <div className="flex flex-wrap gap-2">
                {productTags.map((tag) => {
                  const active = productForm.tags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleProductTag(tag)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition',
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-border bg-white text-slate-600 hover:border-primary hover:text-primary'
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Image URLs
              <textarea
                value={productForm.images}
                onChange={(event) => setProductForm((state) => ({ ...state, images: event.target.value }))}
                rows={3}
                placeholder="Comma separated URLs"
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              {selectedProductId ? 'Save changes' : 'Create product'}
            </button>
            {selectedProductId && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                onClick={() => setSelectedProductId('')}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderBanners = () => (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Banners</h2>
          <p className="text-sm text-muted">Manage promotional assets across the storefront.</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {banners.map((banner) => (
            <article
              key={banner.id}
              className={cn(
                'rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary hover:shadow-md',
                selectedBannerId === banner.id && 'border-primary bg-white shadow-md'
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {banner.type}
                    </span>
                    {banner.text && <p className="text-sm text-slate-700">{banner.text}</p>}
                  </div>
                  <StatusPill
                    label={banner.isActive ? 'Active' : 'Hidden'}
                    tone={banner.isActive ? 'positive' : 'warning'}
                  />
                </div>
                <p className="text-xs text-muted">Order: {banner.order ?? 0}</p>
                {banner.linkUrl && (
                  <a
                    href={banner.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:text-primary-dark"
                  >
                    {banner.linkUrl}
                  </a>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => setSelectedBannerId(banner.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    onClick={() => deleteBanner(banner.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!banners.length && (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No banners yet.
            </div>
          )}
        </div>
        <div>
          <form
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-sm"
            onSubmit={handleBannerSubmit}
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedBannerId ? 'Update banner' : 'Create banner'}
              </h3>
              <p className="text-xs text-muted">Provide imagery, copy, and placement.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Type
              <select
                value={bannerForm.type}
                onChange={(event) => setBannerForm((state) => ({ ...state, type: event.target.value as BannerType }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {bannerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Image URL
              <input
                type="url"
                value={bannerForm.imageUrl}
                onChange={(event) => setBannerForm((state) => ({ ...state, imageUrl: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Link URL
              <input
                type="url"
                value={bannerForm.linkUrl}
                onChange={(event) => setBannerForm((state) => ({ ...state, linkUrl: event.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Text
              <textarea
                value={bannerForm.text}
                onChange={(event) => setBannerForm((state) => ({ ...state, text: event.target.value }))}
                rows={3}
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Display order
              <input
                type="number"
                value={bannerForm.order}
                onChange={(event) => setBannerForm((state) => ({ ...state, order: Number(event.target.value) }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={bannerForm.isActive}
                onChange={(event) => setBannerForm((state) => ({ ...state, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary/30"
              />
              Active
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              {selectedBannerId ? 'Save changes' : 'Create banner'}
            </button>
            {selectedBannerId && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-primary"
                onClick={() => setSelectedBannerId('')}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderOrders = () => (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
          <p className="text-sm text-muted">Monitor fulfillment and update statuses.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold text-right">Total</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {orders.map((order) => {
              const total = order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
              return (
                <tr key={order.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{order.userId}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={order.status}
                      tone={
                        order.status === 'completed'
                          ? 'positive'
                          : order.status === 'cancelled'
                          ? 'critical'
                          : 'warning'
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(order.createdAt)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEditOrders(user?.role ?? 'client') ? (
                      <select
                        value={order.status}
                        onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted">No access</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

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
    <SiteLayout>
      <DashboardLayout
        title={dashboardTitle}
        subtitle="Manage storefront data and monitor operations"
        sidebar={sidebar}
      >
        {statusMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'banners' && renderBanners()}
        {activeTab === 'homepage' && renderHomepage()}
        {activeTab === 'orders' && renderOrders()}
      </DashboardLayout>

      {/* Deletion Confirmation Modal */}
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
                  Are you sure you want to delete this {deleteConfirmation.type === 'hero' ? 'hero slide' : 'featured item'}?
                </p>
                <p className="mt-2 text-sm font-semibold text-red-600">
                  ⚠️ This is a hard delete and cannot be recovered.
                </p>
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
                  if (deleteConfirmation.type === 'hero') {
                    void deleteHeroSlide(deleteConfirmation.id);
                  } else {
                    void deleteFeaturedItem(deleteConfirmation.id);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/20"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
};
