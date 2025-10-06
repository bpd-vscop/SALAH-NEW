import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
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

const adminTabs = [
  { id: 'users', label: 'Users' },
  { id: 'categories', label: 'Categories' },
  { id: 'products', label: 'Products' },
  { id: 'banners', label: 'Banners' },
  { id: 'orders', label: 'Orders' },
] as const;

const productTags: ProductTag[] = ['in stock', 'out of stock', 'on sale', 'available to order'];
const bannerTypes: BannerType[] = ['slide', 'row', 'advertising'];
const orderStatuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];

const canManageUsers = (role: UserRole) => role === 'admin';
const canEditUsers = (role: UserRole) => role === 'admin' || role === 'manager';
const canEditOrders = (role: UserRole) => role === 'admin' || role === 'manager' || role === 'staff';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof adminTabs)[number]['id']>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
      {adminTabs.map((tab) => (
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
      ))}
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
        {activeTab === 'orders' && renderOrders()}
      </DashboardLayout>
    </SiteLayout>
  );
};
