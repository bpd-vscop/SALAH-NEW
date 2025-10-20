import { useState, useEffect, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { uploadsApi } from '../api/uploads';
import { useNavigate } from 'react-router-dom';
import { adminTabs, getMenuIcon, homepageTabs } from '../utils/adminSidebar';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';

export const UserSettingsPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homepageNavSelection, setHomepageNavSelection] = useState<'hero' | 'featured'>('hero');

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [profileImageStatus, setProfileImageStatus] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState<string | null>(null);
  const [profileImageLoading, setProfileImageLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
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
        name: profileForm.name,
        email: profileForm.email,
      });
      setStatusMessage('Profile updated successfully');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }
    setProfileImageLoading(true);
    setProfileImageStatus(null);
    setProfileImageError(null);
    try {
      await uploadsApi.uploadProfileImage(file);
      await refresh();
      setProfileImageStatus('Profile image updated successfully');
    } catch (err) {
      console.error(err);
      setProfileImageError(err instanceof Error ? err.message : 'Failed to update profile image');
    } finally {
      setProfileImageLoading(false);
      event.target.value = '';
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      await usersApi.update(user.id, {
        password: passwordForm.newPassword,
      });
      setStatusMessage('Password updated successfully');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
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
              items: homepageTabs.map((child) => ({ id: child.id, label: child.label })),
              activeId: homepageNavSelection,
              groupLabel: 'Homepage',
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-slate-100">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-500">{user?.name?.charAt(0) ?? 'U'}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Profile image</p>
                <p className="text-xs text-muted">Upload a square image (JPG, PNG, or WEBP).</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleProfileImageUpload}
                    />
                    {profileImageLoading ? 'Uploading…' : 'Upload image'}
                  </label>
                  {user?.profileImageUrl && (
                    <a
                      href={user.profileImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      View current image
                    </a>
                  )}
                </div>
                {profileImageStatus && (
                  <p className="mt-2 text-xs text-emerald-600">{profileImageStatus}</p>
                )}
                {profileImageError && (
                  <p className="mt-2 text-xs text-red-600">{profileImageError}</p>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Full name
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Email address
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
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
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Confirm new password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
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
                {loading ? 'Updating…' : 'Update password'}
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
