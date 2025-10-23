import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent, type ReactNode, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  ChevronDown,
  User,
  ClipboardList,
  Star,
  Settings as SettingsIcon,
  Zap
} from 'lucide-react';
import { ClientDashboardLayout } from '../components/layout/ClientDashboardLayout';
import { ProfileCompletionBar } from '../components/dashboard/ProfileCompletionBar';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { cn } from '../utils/cn';

type TabType = 'account' | 'orders' | 'reviews' | 'settings' | 'b2b-upgrade';

const DASHBOARD_TOP_MARGIN = 28; // matches hero/search stack height
const DESKTOP_SIDEBAR_HEIGHT = `calc(100vh - ${DASHBOARD_TOP_MARGIN}px)`;

const resolveProfileImage = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `/uploads/${value}`;
};

export const ClientDashboardPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile image states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [initialProfileImage, setInitialProfileImage] = useState<string | null>(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  // Verification states (B2B)
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [isBottom, setIsBottom] = useState(false);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(120); // Default header height with promo banner

  useEffect(() => {
    const header = document.getElementById('main-header');
    if (header) {
      // Set initial height immediately
      setStickyHeaderHeight(header.offsetHeight);

      const observer = new ResizeObserver(entries => {
        if (entries[0]) {
          setStickyHeaderHeight(entries[0].contentRect.height);
        }
      });
      observer.observe(header);
      return () => observer.disconnect();
    }
  }, []);

  const MOBILE_MENU_STICKY_OFFSET = stickyHeaderHeight + 12;

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!mobileHeaderRef.current || !contentContainerRef.current || window.innerWidth >= 1024) {
            setIsFixed(false);
            setIsBottom(false);
            ticking = false;
            return;
          }

          if (mobileHeaderRef.current && mobileHeaderHeight === 0) {
            setMobileHeaderHeight(mobileHeaderRef.current.offsetHeight);
          }

          const header = mobileHeaderRef.current;
          const container = contentContainerRef.current;
          const { top: containerTop, height: containerHeight } = container.getBoundingClientRect();
          const headerHeight = header.offsetHeight;
          const stickyTop = MOBILE_MENU_STICKY_OFFSET;

          const shouldBeFixed = containerTop <= stickyTop && containerTop + containerHeight > headerHeight + stickyTop;
          const shouldBeBottom = containerTop + containerHeight <= headerHeight + stickyTop;

          setIsFixed(shouldBeFixed);
          setIsBottom(shouldBeBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [MOBILE_MENU_STICKY_OFFSET, mobileHeaderHeight]);

  const displayInitial = useMemo(() => {
    const source = (user?.name || 'U').trim();
    return (source.charAt(0) || 'U').toUpperCase();
  }, [user?.name]);

  // Check URL params for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'orders', 'reviews', 'settings', 'b2b-upgrade'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

  // Initialize profile image
  useEffect(() => {
    if (!user) return;
    const resolved = resolveProfileImage(user.profileImage ?? null);
    setInitialProfileImage(resolved);
    setProfileImagePreview(resolved);
    setRemoveProfileImage(false);
    setProfileImageFile(null);
    setPreviewObjectUrl(null);
  }, [user]);

  // Cleanup preview URL
  useEffect(
    () => () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    },
    [previewObjectUrl]
  );

  // Redirect non-clients
  useEffect(() => {
    if (user && user.role !== 'client') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSidebarOpen(false); // Close sidebar on mobile after selection

    // Smooth scroll to top when changing tabs
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
      if (profileImageFile) {
        payload.append('profileImage', profileImageFile);
      } else if (removeProfileImage) {
        payload.append('removeProfileImage', 'true');
      }

      await usersApi.update(user.id, payload);
      await refresh();

      setStatusMessage('Profile picture updated successfully');
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

  const handleVerificationUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !verificationFile) return;

    setVerificationLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('verificationFile', verificationFile);

      await usersApi.update(user.id, payload);
      await refresh();

      setStatusMessage('Verification document uploaded successfully');
      setVerificationFile(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to upload verification document');
    } finally {
      setVerificationLoading(false);
    }
  };

  if (!user) {
    return (
      <ClientDashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </ClientDashboardLayout>
    );
  }

  const isB2B = user.clientType === 'B2B';
  const isC2B = user.clientType === 'C2B';

  const getTabIcon = (tabId: TabType): ReactNode => {
    const baseClass = 'h-5 w-5';
    switch (tabId) {
      case 'account':
        return <User className={baseClass} />;
      case 'orders':
        return <ClipboardList className={baseClass} />;
      case 'reviews':
        return <Star className={baseClass} />;
      case 'settings':
        return <SettingsIcon className={baseClass} />;
      case 'b2b-upgrade':
        return <Zap className={baseClass} />;
      default:
        return null;
    }
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'account' as TabType, label: 'Account' },
    { id: 'orders' as TabType, label: 'Orders' },
    { id: 'reviews' as TabType, label: 'Reviews' },
    { id: 'settings' as TabType, label: 'Settings' },
  ];

  // Add B2B upgrade tab only for C2B users
  if (isC2B) {
    tabs.push({ id: 'b2b-upgrade' as TabType, label: 'Upgrade to B2B' });
  }

  const getTabTitle = () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    return currentTab?.label || 'Account';
  };

  return (
    <ClientDashboardLayout>
      <div
        className="relative flex min-h-screen lg:gap-6"
        style={{ paddingTop: `${DASHBOARD_TOP_MARGIN}px` }}
      >
        {/* Desktop Sidebar - Collapsible (like tablet admin) */}
        <aside
          className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-16'}`}
        >
          <div
            className="sticky z-30 w-full"
            style={{ top: `${DASHBOARD_TOP_MARGIN}px` }}
          >
            <div
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all duration-300"
              style={{ height: DESKTOP_SIDEBAR_HEIGHT }}
            >
              {!sidebarOpen && (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
                    aria-label="Open menu"
                    title="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title={tab.label}
                    >
                      {getTabIcon(tab.id)}
                      {tab.id === 'b2b-upgrade' && (
                        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {sidebarOpen && (
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-3 border-b border-slate-200 bg-white p-4">
                    <button
                      onClick={() => navigate('/')}
                      className="flex flex-1 items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-primary"
                    >
                      <Home className="h-4 w-4" />
                      Back to Store
                    </button>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-slate-100 text-lg font-semibold text-slate-500">
                        {profileImagePreview ? (
                          <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <span>{displayInitial}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-600">{isB2B ? 'B2B Account' : 'C2B Account'}</p>
                      </div>
                    </div>
                  </div>

                  <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          handleTabChange(tab.id);
                          setSidebarOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {getTabIcon(tab.id)}
                        <span className="font-medium">{tab.label}</span>
                        {tab.id === 'b2b-upgrade' && (
                          <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay for closing when clicking outside */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="dashboard-overlay"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-20 bg-black/10 lg:bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Main Content - With proper margins */}
        <div className="flex-1 p-4 transition-all duration-300 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6" ref={contentContainerRef}>
            {/* Header */}
            {isFixed && <div style={{ height: mobileHeaderHeight }} />}
            <div
              ref={mobileHeaderRef}
              className={cn(
                'z-30 -mx-2 px-2 lg:static lg:z-auto lg:mx-0 lg:px-0 transition-all duration-200 ease-out',
                !isFixed && !isBottom && 'relative',
              )}
              style={
                isFixed
                  ? {
                      position: 'fixed',
                      top: `${MOBILE_MENU_STICKY_OFFSET}px`,
                      width: mobileHeaderRef.current?.parentElement?.clientWidth,
                      willChange: 'transform',
                    }
                  : isBottom
                  ? {
                      position: 'absolute',
                      bottom: 0,
                      width: mobileHeaderRef.current?.parentElement?.clientWidth,
                      willChange: 'transform',
                    }
                  : { willChange: 'auto' }
              }
            >
              <div className="relative">
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:rounded-none lg:border-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none ${
                    sidebarOpen ? 'z-40' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSidebarOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary lg:hidden"
                    aria-expanded={sidebarOpen}
                    aria-controls="dashboard-mobile-menu"
                  >
                    <span>{getTabTitle()}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <h1 className="hidden text-2xl font-bold text-slate-900 lg:block">{getTabTitle()}</h1>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      id="dashboard-mobile-menu"
                      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:hidden"
                      initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      style={{ transformOrigin: 'top' }}
                    >
                      <nav className="space-y-1 p-3">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                              activeTab === tab.id
                                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {getTabIcon(tab.id)}
                            <span>{tab.label}</span>
                            {tab.id === 'b2b-upgrade' && (
                              <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                          </button>
                        ))}
                      </nav>
                      <div className="border-t border-slate-200 bg-slate-50 p-3">
                        <button
                          onClick={() => {
                            setSidebarOpen(false);
                            navigate('/');
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                        >
                          <Home className="h-4 w-4" />
                          Back to Store
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Profile Completion Bar */}
            <ProfileCompletionBar user={user} />

            {/* Status Messages */}
            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
              {activeTab === 'account' && (
                <div className="space-y-6">
                  {/* Profile Picture Section */}
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-slate-100 text-2xl font-semibold text-slate-500">
                          {profileImagePreview ? (
                            <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span>{displayInitial}</span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <p className="font-semibold text-slate-900">Profile Photo</p>
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
                                Remove
                              </button>
                            )}
                            {profileImageFile && (
                              <button
                                type="button"
                                onClick={handleUndoRemoveProfileImage}
                                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                              >
                                Cancel
                              </button>
                            )}
                            {removeProfileImage && initialProfileImage && (
                              <button
                                type="button"
                                onClick={handleUndoRemoveProfileImage}
                                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                          {profileImageFile && (
                            <p className="text-xs text-slate-500">Selected: {profileImageFile.name}</p>
                          )}
                          {removeProfileImage && (
                            <p className="text-xs text-amber-600">Photo will be removed after saving.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {(profileImageFile || removeProfileImage) && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save Photo'}
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Account Details - Read Only */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-600">Full Name</label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                        {user.name}
                      </div>
                      <p className="text-xs text-slate-500">Set during registration - cannot be changed</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-600">Email Address</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                          {user.email || 'Not provided'}
                        </div>
                        {user.isEmailVerified && (
                          <span className="inline-flex items-center gap-1 text-emerald-600" title="Verified">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Set during registration - cannot be changed</p>
                    </div>

                    {user.username && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">Username</label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                          {user.username}
                        </div>
                        <p className="text-xs text-slate-500">Set during registration - cannot be changed</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-600">Account Type</label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                        {isB2B ? 'Business (B2B)' : 'Consumer (C2B)'}
                      </div>
                    </div>

                    {user.accountCreated && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">Member Since</label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                          {new Date(user.accountCreated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-600">User ID</label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-900">
                        {user.id}
                      </div>
                    </div>
                  </div>

                  {/* Company Information (B2B Only) */}
                  {isB2B && user.company && (
                    <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-2">
                        <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-800 font-medium">
                          Company information cannot be changed after B2B conversion. Contact support if you need to update these details.
                        </p>
                      </div>

                      <h3 className="text-lg font-semibold text-slate-900">Company Information</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {user.company.name && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Company Name</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                              {user.company.name}
                            </div>
                          </div>
                        )}
                        {user.company.address && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Company Address</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                              {user.company.address}
                            </div>
                          </div>
                        )}
                        {user.company.phone && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Company Phone</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                              {user.company.phone}
                            </div>
                          </div>
                        )}
                        {user.company.businessType && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Business Type</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                              {user.company.businessType}
                            </div>
                          </div>
                        )}
                        {user.company.taxId && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Tax ID</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-900">
                              {user.company.taxId}
                            </div>
                          </div>
                        )}
                        {user.company.website && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Website</label>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
                              <a href={user.company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {user.company.website}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verification Section (B2B Only) */}
                  {isB2B && (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                          <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900">Business Verification</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Upload your business license, tax certificate, or other official business documentation to verify your B2B account and unlock full purchasing capabilities.
                          </p>
                        </div>
                      </div>

                      {user.verificationFileUrl ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-center gap-3">
                            <svg className="h-8 w-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="font-semibold text-emerald-900">Verification Document Submitted</p>
                              <p className="text-sm text-emerald-700">Your document is under review. We'll notify you once verified.</p>
                              <a
                                href={user.verificationFileUrl.startsWith('http') ? user.verificationFileUrl : `/uploads/${user.verificationFileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-emerald-600 hover:underline mt-1 inline-block"
                              >
                                View submitted document
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleVerificationUpload} className="space-y-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Upload Verification Document</label>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                            />
                            <p className="text-xs text-slate-500">Accepted formats: PDF, JPG, PNG (max 10MB)</p>
                          </div>
                          {verificationFile && (
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={verificationLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
                              >
                                {verificationLoading ? 'Uploading...' : 'Upload Document'}
                              </button>
                            </div>
                          )}
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No orders yet</h3>
                    <p className="mt-2 text-sm text-slate-600">Start shopping to see your order history here.</p>
                    <button
                      onClick={() => navigate('/')}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
                    >
                      Browse Products
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No reviews yet</h3>
                    <p className="mt-2 text-sm text-slate-600">Reviews for products you've purchased will appear here.</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <p className="text-slate-600">Settings and shipping information will be available in Phase 2.</p>
                </div>
              )}

              {activeTab === 'b2b-upgrade' && isC2B && (
                <div className="space-y-6">
                  <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-8 shadow-lg animate-[highlight_3s_ease-in-out]">
                    <div className="pointer-events-none absolute top-0 right-0 -mt-4 -mr-4 z-0">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-4xl shadow-lg">
                        🚀
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-2xl font-bold text-slate-900 mb-4">Upgrade to B2B Account</h2>
                      <p className="text-slate-700 mb-6">
                        Unlock exclusive benefits and access to our full B2B catalog! Over 90% of our products are available exclusively to B2B customers.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2 mb-6">
                        <div className="flex items-start gap-3">
                          <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-slate-900">Access to B2B Catalog</p>
                            <p className="text-sm text-slate-600">90%+ of products available</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-slate-900">Wholesale Pricing</p>
                            <p className="text-sm text-slate-600">Better prices for bulk orders</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-slate-900">Priority Support</p>
                            <p className="text-sm text-slate-600">Dedicated account manager</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-slate-900">Flexible Payment Terms</p>
                            <p className="text-sm text-slate-600">Net 30/60 options available</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-6">
                        <strong>Note:</strong> Once converted to B2B, your company information cannot be changed. Please ensure all details are accurate before proceeding. Contact support if you need assistance.
                      </p>
                      <button
                        onClick={() => alert('B2B conversion flow will be implemented in Phase 3')}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-700 hover:shadow-xl"
                      >
                        Start Upgrade Process
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes highlight {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.4);
          }
        }
      `}</style>
    </ClientDashboardLayout>
  );
};
