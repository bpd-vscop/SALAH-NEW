import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { bannersApi } from '../../api/banners';
import { categoriesApi } from '../../api/categories';
import { featuredShowcaseApi, type FeaturedShowcaseItem, type FeaturedVariant } from '../../api/featuredShowcase';
import { heroSlidesApi, type HeroSlide } from '../../api/heroSlides';
import { ordersApi } from '../../api/orders';
import { productsApi } from '../../api/products';
import { usersApi } from '../../api/users';
import { menuApi, type MenuSectionInput, type MenuLinkInput } from '../../api/menu';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { useAuth } from '../../context/AuthContext';
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
} from '../../types/api';
import { cn } from '../../utils/cn';
import { UsersAdminSection } from './UsersAdminSection';
import { CategoriesAdminSection } from './CategoriesAdminSection';
import { ProductsAdminSection } from './ProductsAdminSection';
import { BannersAdminSection } from './BannersAdminSection';
import { HomepageAdminSection } from './HomepageAdminSection';
import { OrdersAdminSection } from './OrdersAdminSection';
import { NavigationAdminSection } from './NavigationAdminSection';
import type {
  BannerFormState,
  CategoryFormState,
  DeleteConfirmationState,
  FeatureFormState,
  HeroSlideFormState,
  OrderConflictState,
  ProductFormState,
  StatusSetter,
  UserFormState,
} from './types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const adminTabs = [
  { id: 'users', label: 'Users' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'banners', label: 'Banners' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'orders', label: 'Orders' },
] as const;

const homepageTabs = [
  { id: 'hero' as const, label: 'Hero slider' },
  { id: 'featured' as const, label: 'Featured highlights' },
];

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
  const role = user?.role ?? 'client';
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedShowcaseItem[]>([]);
  const [menuSectionsDraft, setMenuSectionsDraft] = useState<MenuSectionInput[]>([]);
  const [menuLinksDraft, setMenuLinksDraft] = useState<MenuLinkInput[]>([]);
  const [savingMenu, setSavingMenu] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userForm, setUserForm] = useState<UserFormState>({
    name: '',
    username: '',
    role: 'client',
    status: 'active',
    password: '',
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', parentId: '' });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: '',
    categoryId: '',
    price: 0,
    tags: new Set<ProductTag>(),
    description: '',
    images: '',
  });

  const [selectedBannerId, setSelectedBannerId] = useState<string>('');
  const [bannerForm, setBannerForm] = useState<BannerFormState>({
    type: 'slide',
    imageUrl: '',
    text: '',
    linkUrl: '',
    order: 0,
    isActive: true,
  });

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

  const [homepageSection, setHomepageSection] = useState<'hero' | 'featured'>('hero');
  const [homepageExpanded, setHomepageExpanded] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'feature' | 'tile'>('feature');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>(null);
  const [orderConflict, setOrderConflict] = useState<OrderConflictState>(null);

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

  const refreshMenu = async () => {
    const { menu } = await menuApi.get();
    const sections = menu.sections ?? [];
    const links = menu.links ?? [];

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
      }))
    );

    setMenuLinksDraft(
      links.map((link, linkIndex) => ({
        id: link.id,
        label: link.label,
        href: link.href,
        order: link.order ?? linkIndex,
      }))
    );
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
          refreshMenu(),
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
        tags: new Set(),
        description: '',
        images: '',
      });
      return;
    }

    const existing = products.find((product) => product.id === selectedProductId);
    if (existing) {
      setProductForm({
        name: existing.name,
        categoryId: existing.categoryId ?? '',
        price: existing.price ?? 0,
        tags: new Set(existing.tags),
        description: existing.description ?? '',
        images: existing.images.join(', '),
      });
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (!selectedBannerId) {
      setBannerForm({
        type: 'slide',
        imageUrl: '',
        text: '',
        linkUrl: '',
        order: 0,
        isActive: true,
      });
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
        order: 1,
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
      const count = featuredItems.filter((item) => item.variant === activeFeatureTab).length;
      setFeatureForm({ ...emptyFeatureForm(activeFeatureTab), order: count });
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

  const setStatus: StatusSetter = (message, errorMessage = null) => {
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
        await bannersApi.create(payload);
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

  const handleHeroSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!heroSlideForm.desktopImage || !heroSlideForm.mobileImage) {
        setStatus(null, 'Desktop and mobile images are required');
        return;
      }

      const payload = {
        title: heroSlideForm.title,
        subtitle: heroSlideForm.subtitle,
        caption: heroSlideForm.caption,
        ctaText: heroSlideForm.ctaText,
        linkUrl: heroSlideForm.linkUrl,
        order: heroSlideForm.order,
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

  const handleFeatureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!featureForm.image) {
        setStatus(null, 'Image is required');
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

  const handleMenuSave = async () => {
    setSavingMenu(true);
    try {
      const sanitizedSections = menuSectionsDraft
        .filter((section) => section.name.trim())
        .map((section, sectionIndex) => ({
          id: section.id,
          name: section.name.trim(),
          icon: section.icon,
          order: typeof section.order === 'number' ? section.order : sectionIndex,
          items: (section.items ?? [])
            .filter((item) => item.categoryId)
            .map((item, itemIndex) => ({
              id: item.id,
              categoryId: item.categoryId,
              productId: item.productId || null,
              order: typeof item.order === 'number' ? item.order : itemIndex,
            })),
        }));

      const sanitizedLinks = menuLinksDraft
        .filter((link) => link.label.trim() && link.href.trim())
        .slice(0, 3)
        .map((link, linkIndex) => ({
          id: link.id,
          label: link.label.trim(),
          href: link.href.trim(),
          order: typeof link.order === 'number' ? link.order : linkIndex,
        }));

      await menuApi.update({ sections: sanitizedSections, links: sanitizedLinks });
      setStatus('Navigation menu updated');
      await refreshMenu();
    } catch (err) {
      console.error(err);
      setStatus(null, err instanceof Error ? err.message : 'Navigation update failed');
    } finally {
      setSavingMenu(false);
    }
  };

  const dashboardTitle = role === 'admin' ? 'Admin Dashboard' : 'Staff Dashboard';

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
                          setActiveTab('homepage');
                          setHomepageSection(child.id);
                        }}
                        className={cn(
                          'rounded-xl px-4 py-2 text-left font-medium transition',
                          selected
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
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

        {activeTab === 'users' && (
          <UsersAdminSection
            users={users}
            loading={loading}
            form={userForm}
            setForm={setUserForm}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            onSubmit={handleUserSubmit}
            onDelete={deleteUser}
            canEditUsers={canEditUsers(role)}
            canManageUsers={canManageUsers(role)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesAdminSection
            categories={categories}
            parentLabelMap={parentLabelMap}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            form={categoryForm}
            setForm={setCategoryForm}
            onSubmit={handleCategorySubmit}
            onDelete={deleteCategory}
          />
        )}

        {activeTab === 'products' && (
          <ProductsAdminSection
            products={products}
            categories={categories}
            categoryNameById={categoryNameById}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            form={productForm}
            setForm={setProductForm}
            onSubmit={handleProductSubmit}
            onDelete={deleteProduct}
            productTags={productTags}
          />
        )}

        {activeTab === 'banners' && (
          <BannersAdminSection
            banners={banners}
            selectedBannerId={selectedBannerId}
            onSelectBanner={setSelectedBannerId}
            form={bannerForm}
            setForm={setBannerForm}
            onSubmit={handleBannerSubmit}
            onDelete={deleteBanner}
            bannerTypes={bannerTypes}
          />
        )}

        {activeTab === 'navigation' && (
          <NavigationAdminSection
            sections={menuSectionsDraft}
            links={menuLinksDraft}
            setSections={setMenuSectionsDraft}
            setLinks={setMenuLinksDraft}
            categories={categories}
            products={products}
            onSave={handleMenuSave}
            saving={savingMenu}
            canEdit={canEditHomepage(role)}
          />
        )}

        {activeTab === 'homepage' && (
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

        {activeTab === 'orders' && (
          <OrdersAdminSection
            orders={orders}
            canEditOrders={canEditOrders(role)}
            orderStatuses={orderStatuses}
            onUpdateStatus={updateOrderStatus}
          />
        )}
      </DashboardLayout>

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
