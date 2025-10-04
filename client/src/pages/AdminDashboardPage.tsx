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
  const [userForm, setUserForm] = useState({ name: '', username: '', role: 'client' as UserRole, status: 'active' as User['status'], password: '' });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryForm, setCategoryForm] = useState({ name: '', parentId: '' });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productForm, setProductForm] = useState({ name: '', categoryId: '', price: 0, tags: new Set<ProductTag>(), description: '', images: '' });

  const [selectedBannerId, setSelectedBannerId] = useState<string>('');
  const [bannerForm, setBannerForm] = useState({ type: 'slide' as BannerType, imageUrl: '', text: '', linkUrl: '', order: 0, isActive: true });

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
      setProductForm({ name: '', categoryId: '', price: 0, tags: new Set<ProductTag>(), description: '', images: '' });
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
      setTimeout(() => setStatusMessage(null), 4000);
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

  const sidebar = (
    <nav className="dashboard-nav">
      {adminTabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={activeTab === tab.id ? 'nav-tab active' : 'nav-tab'}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );

  const pairedCategories = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      if (category.parentId) {
        map.set(category.id, categories.find((parent) => parent.id === category.parentId)?.name ?? '—');
      } else {
        map.set(category.id, 'Top-level');
      }
    });
    return map;
  }, [categories]);

  const renderUsers = () => (
    <section className="dashboard-section">
      <h2>User management</h2>
      {loading && <p>Loading data…</p>}
      <div className="grid-2">
        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>{record.username}</td>
                  <td>{record.role}</td>
                  <td>
                    <StatusPill
                      label={record.status}
                      tone={record.status === 'active' ? 'positive' : 'critical'}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelectedUserId(record.id)}>
                      Edit
                    </button>
                    {canManageUsers(user?.role ?? 'client') && (
                      <button type="button" className="danger" onClick={() => deleteUser(record.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <form className="form-card" onSubmit={handleUserSubmit}>
            <h3>{selectedUserId ? 'Update user' : 'Create user'}</h3>
            <label>
              Name
              <input
                type="text"
                value={userForm.name}
                onChange={(event) => setUserForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Username
              <input
                type="text"
                value={userForm.username}
                onChange={(event) => setUserForm((state) => ({ ...state, username: event.target.value }))}
                pattern="[a-z0-9._-]{3,30}"
                required
              />
            </label>
            <label>
              Role
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((state) => ({ ...state, role: event.target.value as UserRole }))}
                disabled={!canEditUsers(user?.role ?? 'client')}
              >
                <option value="client">Client</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={userForm.status}
                onChange={(event) => setUserForm((state) => ({ ...state, status: event.target.value as User['status'] }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              Password {selectedUserId ? '(leave blank to keep current)' : ''}
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((state) => ({ ...state, password: event.target.value }))}
                minLength={selectedUserId ? 0 : 8}
                required={!selectedUserId}
              />
            </label>
            <button type="submit" className="primary-button" disabled={!canEditUsers(user?.role ?? 'client')}>
              {selectedUserId ? 'Save changes' : 'Create user'}
            </button>
            {selectedUserId && (
              <button type="button" className="ghost-button" onClick={() => setSelectedUserId('')}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderCategories = () => (
    <section className="dashboard-section">
      <h2>Categories</h2>
      <div className="grid-2">
        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{pairedCategories.get(category.id)}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedCategoryId(category.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteCategory(category.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <form className="form-card" onSubmit={handleCategorySubmit}>
            <h3>{selectedCategoryId ? 'Update category' : 'Create category'}</h3>
            <label>
              Name
              <input
                type="text"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Parent category
              <select
                value={categoryForm.parentId}
                onChange={(event) => setCategoryForm((state) => ({ ...state, parentId: event.target.value }))}
              >
                <option value="">Top level</option>
                {categories
                  .filter((candidate) => candidate.id !== selectedCategoryId)
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="primary-button">
              {selectedCategoryId ? 'Save changes' : 'Create category'}
            </button>
            {selectedCategoryId && (
              <button type="button" className="ghost-button" onClick={() => setSelectedCategoryId('')}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const toggleProductTag = (tag: ProductTag) => {
    setProductForm((state) => {
      const next = new Set(state.tags);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return { ...state, tags: next };
    });
  };

  const renderProducts = () => (
    <section className="dashboard-section">
      <h2>Products</h2>
      <div className="grid-2">
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{categories.find((category) => category.id === product.categoryId)?.name ?? '—'}</td>
                  <td>{formatCurrency(product.price ?? 0)}</td>
                  <td>{product.tags.join(', ')}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedProductId(product.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteProduct(product.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <form className="form-card" onSubmit={handleProductSubmit}>
            <h3>{selectedProductId ? 'Update product' : 'Create product'}</h3>
            <label>
              Name
              <input
                type="text"
                value={productForm.name}
                onChange={(event) => setProductForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Category
              <select
                value={productForm.categoryId}
                onChange={(event) => setProductForm((state) => ({ ...state, categoryId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={productForm.price}
                onChange={(event) => setProductForm((state) => ({ ...state, price: Number(event.target.value) }))}
              />
            </label>
            <fieldset className="tag-fieldset">
              <legend>Tags</legend>
              <div className="tag-grid">
                {productTags.map((tag) => (
                  <label key={tag} className={productForm.tags.has(tag) ? 'tag-option active' : 'tag-option'}>
                    <input
                      type="checkbox"
                      checked={productForm.tags.has(tag)}
                      onChange={() => toggleProductTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Description
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((state) => ({ ...state, description: event.target.value }))}
                rows={4}
              />
            </label>
            <label>
              Image URLs (comma separated)
              <textarea
                value={productForm.images}
                onChange={(event) => setProductForm((state) => ({ ...state, images: event.target.value }))}
                rows={3}
              />
            </label>
            <button type="submit" className="primary-button">
              {selectedProductId ? 'Save changes' : 'Create product'}
            </button>
            {selectedProductId && (
              <button type="button" className="ghost-button" onClick={() => setSelectedProductId('')}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderBanners = () => (
    <section className="dashboard-section">
      <h2>Banners</h2>
      <div className="grid-2">
        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Text</th>
                <th>Order</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td>{banner.type}</td>
                  <td>{banner.text ?? '—'}</td>
                  <td>{banner.order ?? 0}</td>
                  <td>{banner.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedBannerId(banner.id)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteBanner(banner.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <form className="form-card" onSubmit={handleBannerSubmit}>
            <h3>{selectedBannerId ? 'Update banner' : 'Create banner'}</h3>
            <label>
              Type
              <select
                value={bannerForm.type}
                onChange={(event) => setBannerForm((state) => ({ ...state, type: event.target.value as BannerType }))}
              >
                {bannerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image URL
              <input
                type="url"
                value={bannerForm.imageUrl}
                onChange={(event) => setBannerForm((state) => ({ ...state, imageUrl: event.target.value }))}
                required
              />
            </label>
            <label>
              Link URL
              <input
                type="url"
                value={bannerForm.linkUrl}
                onChange={(event) => setBannerForm((state) => ({ ...state, linkUrl: event.target.value }))}
              />
            </label>
            <label>
              Text
              <textarea
                value={bannerForm.text}
                onChange={(event) => setBannerForm((state) => ({ ...state, text: event.target.value }))}
              />
            </label>
            <label>
              Display order
              <input
                type="number"
                value={bannerForm.order}
                onChange={(event) => setBannerForm((state) => ({ ...state, order: Number(event.target.value) }))}
              />
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={bannerForm.isActive}
                onChange={(event) => setBannerForm((state) => ({ ...state, isActive: event.target.checked }))}
              />
              Active
            </label>
            <button type="submit" className="primary-button">
              {selectedBannerId ? 'Save changes' : 'Create banner'}
            </button>
            {selectedBannerId && (
              <button type="button" className="ghost-button" onClick={() => setSelectedBannerId('')}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );

  const renderOrders = () => (
    <section className="dashboard-section">
      <h2>Orders</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Status</th>
            <th>Created</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const total = order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
            return (
              <tr key={order.id}>
                <td>{order.id.slice(-6)}</td>
                <td>{order.userId}</td>
                <td>
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
                <td>{formatTimestamp(order.createdAt)}</td>
                <td>{formatCurrency(total)}</td>
                <td>
                  {canEditOrders(user?.role ?? 'client') && (
                    <select
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  if (!user || !canEditOrders(user.role)) {
    return (
      <SiteLayout>
        <div className="dashboard-placeholder">You do not have access to the admin dashboard.</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <DashboardLayout
        title="Admin Control Center"
        subtitle="Manage storefront data and monitor operations"
        sidebar={sidebar}
      >
        {statusMessage && <div className="status success">{statusMessage}</div>}
        {error && <div className="status error">{error}</div>}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'banners' && renderBanners()}
        {activeTab === 'orders' && renderOrders()}
      </DashboardLayout>
    </SiteLayout>
  );
};


