import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { useNavigate } from 'react-router-dom';
import { adminTabs, getMenuIcon, homepageTabs, navigationTabs } from '../utils/adminSidebar';
import { AdminTopNav } from '../components/dashboard/AdminTopNav';
import { meetsPasswordPolicy, PASSWORD_COMPLEXITY_MESSAGE, evaluatePasswordStrength } from '../utils/password';

const resolveProfileImage = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `/uploads/${value}`;
};

export const UserSettingsPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homepageNavSelection, setHomepageNavSelection] = useState<'hero' | 'featured'>('hero');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [initialProfileImage, setInitialProfileImage] = useState<string | null>(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const displayInitial = useMemo(() => {
    const source = (formData.fullName || user?.name || 'U').trim();
    return (source.charAt(0) || 'U').toUpperCase();
  }, [formData.fullName, user?.name]);
  const newPasswordStrength = evaluatePasswordStrength(formData.newPassword);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      fullName: user.name || '',
      email: user.email || '',
      username: user.username || '',
    }));
    const resolved = resolveProfileImage(user.profileImage ?? null);
    setInitialProfileImage(resolved);
    setProfileImagePreview(resolved);
    setRemoveProfileImage(false);
    setProfileImageFile(null);
    setPreviewObjectUrl(null);
  }, [user]);

  useEffect(
    () => () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    },
    [previewObjectUrl]
  );

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setProfileImageFile(file);
    setProfileImagePreview(previewUrl);
    setPreviewObjectUrl(previewUrl);
    setRemoveProfileImage(false);
  };

  const handleRemoveProfileImage = () => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setRemoveProfileImage(true);
  };

  const handleUndoRemoveProfileImage = () => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    setProfileImageFile(null);
    setProfileImagePreview(initialProfileImage);
    setRemoveProfileImage(false);
  };

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('fullName', formData.fullName.trim());
      payload.append('username', formData.username.trim());
      payload.append('email', formData.email.trim());
      if (profileImageFile) {
        payload.append('profileImage', profileImageFile);
      } else if (removeProfileImage) {
        payload.append('removeProfileImage', 'true');
      }

      await usersApi.update(user.id, payload);
      await refresh();

      setStatusMessage('Profile updated successfully');
      setRemoveProfileImage(false);
      setProfileImageFile(null);
      setPreviewObjectUrl(null);
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

    if (!meetsPasswordPolicy(formData.newPassword)) {
      setError(PASSWORD_COMPLEXITY_MESSAGE);
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
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-slate-100 text-xl font-semibold text-slate-500">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{displayInitial}</span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Profile photo</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={handleProfileImageChange}
                      />
                      Upload new
                    </label>
                    {!removeProfileImage && (profileImagePreview || initialProfileImage) && !profileImageFile && (
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                      >
                        Remove photo
                      </button>
                    )}
                    {profileImageFile && (
                      <button
                        type="button"
                        onClick={handleUndoRemoveProfileImage}
                        className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                      >
                        Cancel upload
                      </button>
                    )}
                    {removeProfileImage && initialProfileImage && (
                      <button
                        type="button"
                        onClick={handleUndoRemoveProfileImage}
                        className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                      >
                        Undo remove
                      </button>
                    )}
                  </div>
                  {profileImageFile && (
                    <p className="text-xs text-slate-500">Selected file: {profileImageFile.name}</p>
                  )}
                  {removeProfileImage && (
                    <p className="text-xs text-amber-600">Profile photo will be removed after saving.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Full Name
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  required
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
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
                  className={`h-11 rounded-xl border ${newPasswordStrength.borderClass} bg-white px-4 text-sm transition-colors duration-200 focus:outline-none ${newPasswordStrength.focusClass}`}
                />
                {newPasswordStrength.label && (
                  <p className={`text-xs font-semibold ${newPasswordStrength.colorClass}`}>
                    {newPasswordStrength.label}
                  </p>
                )}
                <p className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</p>
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
