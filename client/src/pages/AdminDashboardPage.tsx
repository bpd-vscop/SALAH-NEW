import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
import { categoryDisplayApi } from '../api/categoryDisplay';
import { featuredShowcaseApi, type FeaturedShowcaseItem, type FeaturedVariant } from '../api/featuredShowcase';
import { heroSlidesApi, type HeroSlide } from '../api/heroSlides';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { usersApi } from '../api/users';
import { menuApi, type MenuSectionInput, type MenuLinkInput } from '../api/menu';
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
  User,
  UserRole,
} from '../types/api';
import { adminTabs, homepageTabs, navigationTabs } from '../utils/adminSidebar';
import { UsersAdminSection } from '../components/dashboard/UsersAdminSection';
import { CategoriesAdminSection } from '../components/dashboard/CategoriesAdminSection';
import { ProductsAdminSection } from '../components/dashboard/ProductsAdminSection';
// import { BannersAdminSection } from '../components/dashboard/BannersAdminSection';
import { ManufacturersAdminSection } from '../components/dashboard/ManufacturersAdminSection';
import { ManufacturersDisplayAdminSection } from '../components/dashboard/ManufacturersDisplayAdminSection';
import { HomepageAdminSection } from '../components/dashboard/HomepageAdminSection';
import { OrdersAdminSection } from '../components/dashboard/OrdersAdminSection';
import { NavigationAdminSection } from '../components/dashboard/NavigationAdminSection';
import type {
  // BannerFormState,
  CategoryFormState,
  CategoryDisplayFormState,
  DeleteConfirmationState,
  FeatureFormState,
  HeroSlideFormState,
  OrderConflictState,
  ProductFormState,
  StatusSetter,
  UserFormState,
} from '../components/dashboard/types';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';
import { useLocation, useNavigate } from 'react-router-dom';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_HOMEPAGE_CATEGORIES = 18;

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
// const bannerTypes: BannerType[] = ['slide', 'row', 'advertising'];
const orderStatuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const canManageUsers = (role: UserRole) => role === 'super_admin';
const canEditUsers = (role: UserRole) => role === 'super_admin' || role === 'admin';
const canEditOrders = (role: UserRole) => role === 'super_admin' || role === 'admin' || role === 'staff';
const canEditHomepage = (role: UserRole) => role === 'super_admin' || role === 'admin' || role === 'staff';
const canDeleteHomepage = (role: UserRole) => role === 'super_admin' || role === 'admin';

const isObjectId = (value?: string | null) => Boolean(value && /^[0-9a-fA-F]{24}$/.test(value));

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? 'client';
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // const [banners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
  const [loading, setLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userForm, setUserForm] = useState<UserFormState>({
    name: '',
    username: '',
    email: '',
    role: 'client',
    status: 'active',
    password: '',
    profileImageUrl: null,
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    parentId: '',
    imageUrl: '',
    heroImageUrl: '',
  });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: '',
    categoryId: '',
    price: 0,
    tags: new Set<ProductTag>(),
    description: '',
    images: '',
  });

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
  const [categoriesSection, setCategoriesSection] = useState<'categories' | 'manufacturers'>('categories');
  const [navigationSection, setNavigationSection] = useState<'topnav' | 'sections' | 'quicklinks' | 'visible'>('topnav');
  const [activeFeatureTab, setActiveFeatureTab] = useState<'feature' | 'tile'>('feature');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>(null);
  const [orderConflict, setOrderConflict] = useState<OrderConflictState>(null);

  useEffect(() => {
    const state = (location.state ?? null) as
      | {
          active?: string;
          homepageSection?: 'hero' | 'featured';
        }
      | null;

    if (state?.active) {
      if (state.active === 'homepage') {
        if (state.homepageSection) {
          setHomepageSection(state.homepageSection);
        }
        setActiveTab('homepage');
      } else if (adminTabs.some((tab) => tab.id === state.active)) {
        setActiveTab(state.active as (typeof adminTabs)[number]['id']);
      }
    }

    if (state?.active || state?.homepageSection) {
      navigate('/admin', { replace: true, state: null });
    }
  }, [location.state, navigate]);

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
          refreshCategoryDisplay(),
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
    if (!selectedUserId) {
      setUserForm({ name: '', username: '', email: '', role: 'client', status: 'active', password: '', profileImageUrl: null });
      return;
    }

    const existing = users.find((candidate) => candidate.id === selectedUserId);
    if (existing) {
      setUserForm({
        name: existing.name,
        username: existing.username,
        email: existing.email || existing.username,
        role: existing.role,
        status: existing.status,
        password: '',
        profileImageUrl: existing.profileImageUrl ?? null,
      });
    }
  }, [selectedUserId, users]);

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
          email: userForm.email,
          role: userForm.role,
          status: userForm.status,
          ...(userForm.password ? { password: userForm.password } : {}),
          profileImageUrl: userForm.profileImageUrl ?? null,
        });
        setStatus('User updated');
      } else {
        await usersApi.create({
          name: userForm.name,
          username: userForm.username,
          email: userForm.email,
          role: userForm.role,
          status: userForm.status,
          password: userForm.password,
          profileImageUrl: userForm.profileImageUrl ?? null,
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
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId || null,
        imageUrl: categoryForm.imageUrl.trim() || null,
        heroImageUrl: categoryForm.heroImageUrl.trim() || null,
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

  const handleCategoryDisplaySave = async () => {
    setSavingCategoryDisplay(true);
    try {
      const orderedCategories = Object.entries(categoryDisplayForm.homepageAssignments)
        .filter(([, id]) => Boolean(id))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, id]) => id)
        .slice(0, MAX_HOMEPAGE_CATEGORIES);

      await categoryDisplayApi.update({
        homepageCategories: orderedCategories,
        allCategoriesHeroImage: categoryDisplayForm.allCategoriesHeroImage || null,
      });
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

  // const handleBannerSubmit = async (_event: FormEvent<HTMLFormElement>) => { /* unused now */ };

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

  // const deleteBanner = async (_id: string) => { /* unused now */ };

  const handleHeroSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!heroSlideForm.desktopImage || !heroSlideForm.mobileImage) {
        setStatus(null, 'Desktop and mobile images are required');
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
            const payload = {
              title: heroSlideForm.title,
              subtitle: heroSlideForm.subtitle,
              caption: heroSlideForm.caption,
              ctaText: heroSlideForm.ctaText,
              linkUrl: heroSlideForm.linkUrl,
              order: computedOrder,
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

      const payload = {
        title: heroSlideForm.title,
        subtitle: heroSlideForm.subtitle,
        caption: heroSlideForm.caption,
        ctaText: heroSlideForm.ctaText,
        linkUrl: heroSlideForm.linkUrl,
        order: computedOrder,
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
      const itemsInVariant = featuredItems.filter((item) => item.variant === activeFeatureTab);
      const maxOrderInVariant = itemsInVariant.reduce((max, it) => Math.max(max, it.order ?? 0), 0);
      const finalOrder = orderToCheck && orderToCheck > 0 ? orderToCheck : maxOrderInVariant + 1;

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
        order: finalOrder,
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

  const handleMenuSave = async () => {
    setSavingMenu(true);
    try {
      const sanitizedSections = menuSectionsDraft
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

      const sanitizedLinks = menuLinksDraft
        .filter((link) => link.label.trim() && link.href.trim())
        .slice(0, 3)
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
          const activeCategoriesLabel =
            categoriesSection === 'manufacturers' ? 'Manufacturers' : 'Categories';
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'manage-categories', label: 'Categories', separatorAfter: true },
                { id: 'manage-manufacturers', label: 'Manufacturers' },
              ],
              activeId: activeTab === 'categories'
                ? (categoriesSection === 'manufacturers' ? 'manage-manufacturers' : 'manage-categories')
                : undefined,
            },
            activeLabel: activeTab === 'categories' ? activeCategoriesLabel : undefined,
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
        return {
          id: tab.id,
          label: tab.label,
          icon: getMenuIcon(tab.id),
        };
      }),
    [homepageSection, navigationSection, activeTab, categoriesSection]
  );

  const handleTopNavSelect = (id: string, dropdownId?: string) => {
    if (id === 'homepage') {
      if (dropdownId === 'hero' || dropdownId === 'featured' || dropdownId === 'categorydisplay' || dropdownId === 'manufacturers') {
        setHomepageSection(dropdownId);
      }
      setActiveTab('homepage');
      return;
    }

    if (id === 'categories') {
      if (dropdownId === 'manage-categories') {
        setCategoriesSection('categories');
      } else if (dropdownId === 'manage-manufacturers') {
        setCategoriesSection('manufacturers');
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
      contentKey={activeTab}
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
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <UsersAdminSection
                users={users}
                loading={loading}
                form={userForm}
                setForm={setUserForm}
                selectedUserId={selectedUserId}
                onSelectUser={setSelectedUserId}
                onSubmit={handleUserSubmit}
                onDelete={(id) => {
                  setDeleteConfirmation({ type: 'user', id });
                  return Promise.resolve();
                }}
                canEditUsers={canEditUsers(role)}
                canManageUsers={canManageUsers(role)}
              />
            </motion.div>
          )}

          {activeTab === 'categories' && categoriesSection === 'categories' && (
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
          {activeTab === 'categories' && categoriesSection === 'manufacturers' && (
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

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
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
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <OrdersAdminSection
                orders={orders}
                canEditOrders={canEditOrders(role)}
                orderStatuses={orderStatuses}
                onUpdateStatus={updateOrderStatus}
              />
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
                  {deleteConfirmation.type === 'user' && 'Are you sure you want to delete this user?'}
                  {deleteConfirmation.type === 'category' && 'Are you sure you want to delete this category?'}
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
                  } else if (t === 'user') {
                    void deleteUser(deleteConfirmation.id);
                  } else if (t === 'category') {
                    void deleteCategory(deleteConfirmation.id);
                  } else if (t === 'menu-section') {
                    const index = Number(deleteConfirmation.id);
                    setMenuSectionsDraft((current) => current.filter((_, i) => i !== index));
                  } else if (t === 'menu-link') {
                    const index = Number(deleteConfirmation.id);
                    setMenuLinksDraft((current) => current.filter((_, i) => i !== index));
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
