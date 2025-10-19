import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { useNavigate } from 'react-router-dom';
import { adminTabs, getMenuIcon, homepageTabs, navigationTabs } from '../utils/adminSidebar';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';

export const UserSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homepageNavSelection, setHomepageNavSelection] = useState<'hero' | 'featured'>('hero');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        username: user.username || '',
      }));
    }
  }, [user]);

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      await usersApi.update(user.id, {
        name: formData.name,
        username: formData.username,
      });
      setStatusMessage('Profile updated successfully');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      await usersApi.update(user.id, {
        password: formData.newPassword,
      });
      setStatusMessage('Password updated successfully');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const topNavItems = useMemo(
    () =>
      adminTabs.map((tab) => {
        if (tab.id === 'homepage') {
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: homepageTabs.map((child, index) => ({
                id: child.id,
                label: child.label,
                separatorAfter: index < homepageTabs.length - 1,
              })),
              activeId: homepageNavSelection,
              groupLabel: 'Homepage',
            },
          };
        }
        if (tab.id === 'categories') {
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: [
                { id: 'manage-categories', label: 'Categories', separatorAfter: true },
                { id: 'manage-manufacturers', label: 'Manufacturers' },
              ],
            },
          };
        }
        if (tab.id === 'navigation') {
          return {
            id: tab.id,
            label: tab.label,
            icon: getMenuIcon(tab.id),
            dropdown: {
              items: navigationTabs.map((child, index) => ({
                id: child.id,
                label: child.label,
                separatorAfter: index === 0,
              })),
              groupLabel: 'Menu',
            },
          };
        }
        return {
          id: tab.id,
          label: tab.label,
          icon: getMenuIcon(tab.id),
        };
      }),
    [homepageNavSelection]
  );

  const handleTopNavSelect = (id: string, dropdownId?: string) => {
    if (id === 'homepage') {
      const section: 'hero' | 'featured' = dropdownId === 'featured' ? 'featured' : 'hero';
      setHomepageNavSelection(section);
      navigate('/admin', { state: { active: 'homepage', homepageSection: section } });
      return;
    }

    navigate('/admin', { state: { active: id } });
  };

  return (
    <AdminLayout
      topNav={<AdminTopNav items={topNavItems} activeId="settings" onSelect={handleTopNavSelect} />}
      contentKey="settings"
    >
      <div className="space-y-6">
        <div className="h-1" />

        {statusMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Profile Information */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Full Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Username
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Current Password
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                New Password
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Confirm New Password
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* Account Information */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">User ID</span>
              <span className="text-sm font-mono text-slate-900">{user?.id || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Role</span>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                {user?.role || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Status</span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${
                  user?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {user?.status || 'N/A'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};
