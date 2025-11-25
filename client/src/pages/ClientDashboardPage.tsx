import { useState, useEffect, useMemo, useCallback, type ChangeEvent, type FormEvent, type ReactNode, useRef } from 'react';
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
  Zap,
  Plus,
  MapPin,
  Trash2,
  Edit,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Package,
  Calendar,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { ClientDashboardLayout } from '../components/layout/ClientDashboardLayout';
import { ProfileCompletionBar } from '../components/dashboard/ProfileCompletionBar';
import { useAuth } from '../context/AuthContext';
import { usersApi, type ShippingAddressPayload } from '../api/users';
import { ordersApi } from '../api/orders';
import { cn } from '../utils/cn';
import type { ShippingAddress, Order } from '../types/api';
import { evaluatePasswordStrength, PASSWORD_COMPLEXITY_MESSAGE } from '../utils/password';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';
import { CountrySelect } from '../components/common/CountrySelect';
import { COUNTRIES } from '../data/countries';
import { BusinessTypeSelect } from '../components/common/BusinessTypeSelect';
import { isBusinessTypeOption, type BusinessTypeOption } from '../data/businessTypes';
import { formatCurrency } from '../utils/format';

type TabType = 'account' | 'orders' | 'reviews' | 'settings' | 'b2b-upgrade';

const DASHBOARD_TOP_MARGIN = 28; // matches hero/search stack height
const DESKTOP_SIDEBAR_HEIGHT = `calc(100vh - ${DASHBOARD_TOP_MARGIN}px)`;
const COMPANY_WEBSITE_PATTERN = /^[^\s]+\.[^\s]+$/;

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersLastSeenAt, setOrdersLastSeenAt] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = Number(localStorage.getItem('ordersLastSeenAt') || '0');
    return Number.isFinite(stored) ? stored : 0;
  });

  // Profile image states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [initialProfileImage, setInitialProfileImage] = useState<string | null>(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  // Verification states (B2B)
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // B2B Conversion states
  const [b2bConversionStep, setB2bConversionStep] = useState<'info' | 'form'>('info');
  const [b2bFormData, setB2bFormData] = useState({
    companyName: '',
    businessType: '',
    taxId: '',
    website: '',
  });
  const [useCustomBusinessType, setUseCustomBusinessType] = useState(false);
  const [b2bVerificationFile, setB2bVerificationFile] = useState<File | null>(null);
  const [b2bConversionLoading, setB2bConversionLoading] = useState(false);
  const [companyTaxIdDraft, setCompanyTaxIdDraft] = useState('');
  const [companyWebsiteDraft, setCompanyWebsiteDraft] = useState('');
  const [companyDetailsLoading, setCompanyDetailsLoading] = useState(false);
  const [companyDetailsError, setCompanyDetailsError] = useState<string | null>(null);
  const [companyDetailsSuccess, setCompanyDetailsSuccess] = useState<string | null>(null);

  // Shipping address states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<ShippingAddressPayload>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    isDefault: false,
  });
  const [addressPhoneValue, setAddressPhoneValue] = useState<PhoneNumberInputValue>({
    countryCode: '+1',
    number: ''
  });
  const [addressLoading, setAddressLoading] = useState(false);

  // Phone editing states (account info)
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState<PhoneNumberInputValue>({
    countryCode: '+1',
    number: ''
  });
  const [phoneUpdateLoading, setPhoneUpdateLoading] = useState(false);

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'request' | 'verify'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const ordersBadgeCount = useMemo(() => {
    const seenAt = ordersLastSeenAt || 0;
    return orders.filter((order) => {
      const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      const isActive = order.status === 'pending' || order.status === 'processing';
      return isActive && created > seenAt;
    }).length;
  }, [orders, ordersLastSeenAt]);

  const formatOrderDate = (value?: string | null) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check URL params for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'orders', 'reviews', 'settings', 'b2b-upgrade'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

  // Sync orders last-seen timestamp across tabs/windows
  useEffect(() => {
    const syncLastSeen = (event?: Event) => {
      const stored = Number(localStorage.getItem('ordersLastSeenAt') || '0');
      const detailTs =
        event instanceof CustomEvent && event.detail && typeof event.detail.at === 'number'
          ? event.detail.at
          : 0;
      const candidate = Number.isFinite(detailTs) && detailTs > 0 ? detailTs : stored;
      if (Number.isFinite(candidate) && candidate > ordersLastSeenAt) {
        setOrdersLastSeenAt(candidate);
      }
    };
    window.addEventListener('storage', syncLastSeen);
    window.addEventListener('ordersViewed', syncLastSeen as EventListener);
    return () => {
      window.removeEventListener('storage', syncLastSeen);
      window.removeEventListener('ordersViewed', syncLastSeen as EventListener);
    };
  }, [ordersLastSeenAt]);

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

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { orders: orderList } = await ordersApi.list();
      setOrders(orderList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load orders';
      setOrdersError(message);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'orders') {
      void loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Cleanup preview URL
  useEffect(
    () => () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    },
    [previewObjectUrl]
  );

  useEffect(() => {
    if (user) {
      void loadOrders();
      const stored = Number(localStorage.getItem('ordersLastSeenAt') || '0');
      setOrdersLastSeenAt(Number.isFinite(stored) ? stored : 0);
    } else {
      setOrdersLastSeenAt(0);
    }
  }, [user, loadOrders]);

  // Mark orders as seen when viewing the orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      const now = Date.now();
      setOrdersLastSeenAt(now);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ordersLastSeenAt', String(now));
        window.dispatchEvent(new CustomEvent('ordersViewed', { detail: { at: now } }));
      }
    }
  }, [activeTab]);

  // Redirect non-clients
  useEffect(() => {
    if (user && user.role !== 'client') {
      navigate('/admin');
    }
  }, [user, navigate]);

  useEffect(() => {
    const currentType = b2bFormData.businessType;
    if (!currentType) {
      return;
    }
    if (!isBusinessTypeOption(currentType) && !useCustomBusinessType) {
      setUseCustomBusinessType(true);
    }
  }, [b2bFormData.businessType, useCustomBusinessType]);

  useEffect(() => {
    setCompanyTaxIdDraft('');
    setCompanyWebsiteDraft('');
    setCompanyDetailsError(null);
    setCompanyDetailsSuccess(null);
  }, [user?.company?.taxId, user?.company?.website]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });

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

  const handleBusinessTypePresetSelect = (option: BusinessTypeOption) => {
    setUseCustomBusinessType(false);
    setB2bFormData((prev) => ({
      ...prev,
      businessType: option,
    }));
  };

  const handleEnableCustomBusinessType = () => {
    setUseCustomBusinessType(true);
    setB2bFormData((prev) => ({ ...prev, businessType: '' }));
  };

  const handleCustomBusinessTypeChange = (value: string) => {
    setB2bFormData((prev) => ({ ...prev, businessType: value }));
  };

  const handleSaveCompanyTaxId = async () => {
    if (!user) {
      return;
    }
    const value = companyTaxIdDraft.trim();
    if (!value) {
      setCompanyDetailsError('Tax ID is required.');
      return;
    }
    setCompanyDetailsLoading(true);
    setCompanyDetailsError(null);
    setCompanyDetailsSuccess(null);
    try {
      await usersApi.update(user.id, { companyTaxId: value });
      setCompanyTaxIdDraft('');
      await refresh();
      setCompanyDetailsSuccess('Tax ID added to your company profile.');
    } catch (error) {
      setCompanyDetailsError(error instanceof Error ? error.message : 'Failed to add Tax ID.');
    } finally {
      setCompanyDetailsLoading(false);
    }
  };

  const handleSaveCompanyWebsite = async () => {
    if (!user) {
      return;
    }
    const value = companyWebsiteDraft.trim();
    if (!value) {
      setCompanyDetailsError('Company website is required.');
      return;
    }
    if (!COMPANY_WEBSITE_PATTERN.test(value)) {
      setCompanyDetailsError('Enter a valid website (example.com).');
      return;
    }
    setCompanyDetailsLoading(true);
    setCompanyDetailsError(null);
    setCompanyDetailsSuccess(null);
    try {
      await usersApi.update(user.id, { companyWebsite: value });
      setCompanyWebsiteDraft('');
      await refresh();
      setCompanyDetailsSuccess('Company website added successfully.');
    } catch (error) {
      setCompanyDetailsError(error instanceof Error ? error.message : 'Failed to add company website.');
    } finally {
      setCompanyDetailsLoading(false);
    }
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

  // Shipping address handlers
  const handleAddressFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setAddressLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      if (editingAddressId) {
        await usersApi.updateShippingAddress(user.id, editingAddressId, addressForm);
        await refresh();
        setStatusMessage('Shipping address updated successfully');
      } else {
        await usersApi.addShippingAddress(user.id, addressForm);
        await refresh();
        setStatusMessage('Shipping address added successfully');
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Morocco',
        isDefault: false,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save shipping address');
    } finally {
      setAddressLoading(false);
    }
  };

  const parsePhoneNumber = (phoneCode: string | null | undefined, phoneNumber: string | null | undefined): PhoneNumberInputValue => {
    return {
      countryCode: phoneCode || '+1', // Default to United States
      number: phoneNumber || ''
    };
  };

  const handleAddNewAddress = () => {
    const phoneValue = parsePhoneNumber(user?.phoneCode, user?.phoneNumber);

    setAddressForm({
      fullName: user?.name || '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
      isDefault: false,
    });
    setAddressPhoneValue(phoneValue);
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (address: ShippingAddress) => {
    // Parse phone from combined format by checking known country codes
    let phoneValue: PhoneNumberInputValue = { countryCode: '+1', number: address.phone || '' };

    if (address.phone) {
      // Try to find a matching country code
      const sortedCodes = [...new Set(COUNTRIES.map(c => c.code))].sort((a, b) => b.length - a.length);
      for (const code of sortedCodes) {
        if (address.phone.startsWith(code)) {
          phoneValue = {
            countryCode: code,
            number: address.phone.substring(code.length)
          };
          break;
        }
      }
    }

    setAddressForm({
      fullName: address.fullName || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'United States',
      isDefault: address.isDefault,
    });
    setAddressPhoneValue(phoneValue);
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    setStatusMessage(null);
    setError(null);

    try {
      await usersApi.deleteShippingAddress(user.id, addressId);
      await refresh();
      setStatusMessage('Shipping address deleted successfully');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete shipping address');
    }
  };

  const handleCancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Morocco',
      isDefault: false,
    });
  };

  // Password change handlers
  const handleRequestPasswordChange = async () => {
    if (!user) return;

    setPasswordLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const response = await usersApi.requestPasswordChange(user.id);
      setPasswordStep('verify');
      setStatusMessage(response.message);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setPasswordLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      await usersApi.changePassword(user.id, {
        code: verificationCode,
        newPassword,
      });
      await refresh();
      setStatusMessage('Password changed successfully! A confirmation email has been sent.');
      setShowPasswordForm(false);
      setPasswordStep('request');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordStep('request');
    setNewPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setError(null);
  };

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

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
                    <div key={tab.id} className="relative">
                      <button
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
                      {tab.id === 'orders' && ordersBadgeCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white shadow-md ring-2 ring-white">
                          {ordersBadgeCount > 99 ? '99+' : ordersBadgeCount}
                        </span>
                      )}
                    </div>
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
                      <div key={tab.id} className="relative">
                        <button
                          onClick={() => {
                            handleTabChange(tab.id);
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="relative flex h-5 w-5 items-center justify-center">{getTabIcon(tab.id)}</span>
                          <span className="font-medium">
                            {tab.label}
                          </span>
                          {tab.id === 'b2b-upgrade' && (
                            <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          )}
                        </button>
                        {tab.id === 'orders' && ordersBadgeCount > 0 && (
                          <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white shadow-md ring-2 ring-white">
                            {ordersBadgeCount > 99 ? '99+' : ordersBadgeCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay for closing when clicking outside (mobile only) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="dashboard-overlay"
              // Overlay kept for dimming; does not auto-close sidebar
              className="fixed inset-0 z-20 bg-black/10 lg:hidden"
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
                          <div key={tab.id} className="relative">
                            <button
                              onClick={() => handleTabChange(tab.id)}
                              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                                activeTab === tab.id
                                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="relative flex h-5 w-5 items-center justify-center">{getTabIcon(tab.id)}</span>
                              <span>
                                {tab.label}
                              </span>
                              {tab.id === 'b2b-upgrade' && (
                                <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              )}
                            </button>
                            {tab.id === 'orders' && ordersBadgeCount > 0 && (
                              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white shadow-md ring-2 ring-white">
                                {ordersBadgeCount > 99 ? '99+' : ordersBadgeCount}
                              </span>
                            )}
                          </div>
                        ))}
                      </nav>
                      <div className="border-t border-slate-200 bg-slate-50 p-3">
                        <button
                          onClick={() => {
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

            {/* Profile Completion Bar - Hide after viewing orders */}
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
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
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

                    {(user.phoneCode || user.phoneNumber || isEditingPhone) && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-600">Phone Number</label>
                        {isEditingPhone ? (
                          <PhoneNumberInput
                            value={editPhoneValue}
                            onChange={setEditPhoneValue}
                            placeholder="600000000"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                              {user.phoneCode}{user.phoneNumber}
                            </div>
                            <button
                              onClick={() => {
                                setEditPhoneValue(parsePhoneNumber(user.phoneCode, user.phoneNumber));
                                setIsEditingPhone(true);
                              }}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {isEditingPhone && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditingPhone(false)}
                              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!user) return;
                                setPhoneUpdateLoading(true);
                                setError(null);

                                try {
                                  await usersApi.updatePhone(user.id, {
                                    phoneCode: editPhoneValue.countryCode,
                                    phoneNumber: editPhoneValue.number,
                                  });
                                  await refresh();
                                  setStatusMessage('Phone number updated successfully');
                                  setIsEditingPhone(false);
                                } catch (err) {
                                  console.error(err);
                                  setError(err instanceof Error ? err.message : 'Failed to update phone number');
                                } finally {
                                  setPhoneUpdateLoading(false);
                                }
                              }}
                              disabled={phoneUpdateLoading || !editPhoneValue.number}
                              className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                            >
                              {phoneUpdateLoading ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

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
                          Company information cannot be changed. Contact support if you need to update these details.
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
                              {(() => {
                                const raw = user.company?.website ?? '';
                                const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
                                return (
                                  <a href={normalized} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {raw}
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isB2B && user.company && (!user.company.taxId || !user.company.website) && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
                      <h3 className="text-lg font-semibold text-slate-900">Complete Company Details</h3>
                      <p className="text-sm text-slate-600">
                        Add the remaining optional company information below. Once saved, these fields become locked.
                      </p>
                      {companyDetailsError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                          {companyDetailsError}
                        </div>
                      )}
                      {companyDetailsSuccess && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                          {companyDetailsSuccess}
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        {!user.company.taxId && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Tax ID</label>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <input
                                type="text"
                                value={companyTaxIdDraft}
                                onChange={(event) => setCompanyTaxIdDraft(event.target.value)}
                                placeholder="Tax ID / EIN"
                                disabled={companyDetailsLoading}
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={handleSaveCompanyTaxId}
                                disabled={companyDetailsLoading || !companyTaxIdDraft.trim()}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                        {!user.company.website && (
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Company Website</label>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <input
                                type="text"
                                value={companyWebsiteDraft}
                                onChange={(event) => setCompanyWebsiteDraft(event.target.value)}
                                placeholder="example.com"
                                disabled={companyDetailsLoading}
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={handleSaveCompanyWebsite}
                                disabled={companyDetailsLoading || !companyWebsiteDraft.trim()}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save
                              </button>
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">My Orders</h2>
                      <p className="text-sm text-slate-600 mt-1">Track and manage your recent purchases</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate('/products')}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-600 hover:text-red-600 hover:bg-red-50"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Continue Shopping
                      </button>
                      <button
                        onClick={() => loadOrders()}
                        disabled={ordersLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={cn("h-4 w-4", ordersLoading && "animate-spin")} />
                        {ordersLoading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  </div>

                  {ordersError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800">{ordersError}</p>
                      </div>
                    </div>
                  )}

                  {ordersLoading && (
                    <div className="rounded-lg border border-slate-200 bg-white p-8">
                      <div className="flex items-center justify-center gap-3">
                        <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />
                        <p className="text-sm text-slate-600">Loading your orders...</p>
                      </div>
                    </div>
                  )}

                  {!ordersLoading && orders.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                          <Package className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">No orders yet</h3>
                        <p className="mt-2 text-sm text-slate-600 max-w-sm">Start shopping to see your order history here. Browse our products and place your first order!</p>
                        <button
                          onClick={() => navigate('/products')}
                          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Browse Products
                        </button>
                      </div>
                    </div>
                  )}

                  {orders.length > 0 && (
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 scrollbar-custom">
                      {orders.map((order) => {
                        const itemCount = order.products.reduce((sum, item) => sum + (item.quantity || 0), 0);
                        const total = order.products.reduce(
                          (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                          0
                        );

                        const getStatusConfig = (status: string) => {
                          switch (status) {
                            case 'pending':
                              return {
                                label: 'Processing',
                                icon: Clock,
                                bgColor: 'bg-amber-50',
                                textColor: 'text-amber-700',
                                borderColor: 'border-amber-200',
                                iconColor: 'text-amber-600'
                              };
                            case 'completed':
                              return {
                                label: 'Completed',
                                icon: CheckCircle,
                                bgColor: 'bg-green-50',
                                textColor: 'text-green-700',
                                borderColor: 'border-green-200',
                                iconColor: 'text-green-600'
                              };
                            case 'cancelled':
                              return {
                                label: 'Cancelled',
                                icon: XCircle,
                                bgColor: 'bg-red-50',
                                textColor: 'text-red-700',
                                borderColor: 'border-red-200',
                                iconColor: 'text-red-600'
                              };
                            default:
                              return {
                                label: status,
                                icon: Package,
                                bgColor: 'bg-slate-50',
                                textColor: 'text-slate-700',
                                borderColor: 'border-slate-200',
                                iconColor: 'text-slate-600'
                              };
                          }
                        };

                        const statusConfig = getStatusConfig(order.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <div key={order.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                            {/* Order Header */}
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                                    <Package className="h-6 w-6 text-red-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Order</p>
                                      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        #{order.id.slice(-8)}
                                      </code>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                      <p className="text-sm text-slate-600">{formatOrderDate(order.createdAt)}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 border",
                                    statusConfig.bgColor,
                                    statusConfig.textColor,
                                    statusConfig.borderColor
                                  )}>
                                    <StatusIcon className={cn("h-4 w-4", statusConfig.iconColor)} />
                                    <span className="text-sm font-semibold">{statusConfig.label}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-slate-500">Total</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <ShoppingBag className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-700">
                                  {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                </h3>
                              </div>
                              <div className="space-y-3">
                                {order.products.map((item, index) => (
                                  <div
                                    key={`${order.id}-line-${index}`}
                                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <p className="font-semibold text-slate-900">{item.name}</p>
                                      <p className="text-sm text-slate-500 mt-0.5">Quantity: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-slate-900">
                                        {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {formatCurrency(item.price || 0)} each
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
  <div className="space-y-8">
    {/* Shipping Addresses Section */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Shipping Addresses</h2>
          <p className="mt-1 text-sm text-slate-600">Manage your delivery addresses</p>
        </div>
        {!showAddressForm && (
          <button
            onClick={handleAddNewAddress}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </button>
        )}
      </div>

      {/* Address Form */}
      {showAddressForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {editingAddressId ? 'Edit Address' : 'Add New Address'}
          </h3>
          <form onSubmit={handleAddressFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Phone *</label>
                <PhoneNumberInput
                  value={addressPhoneValue}
                  onChange={(val) => {
                    setAddressPhoneValue(val);
                    setAddressForm({ ...addressForm, phone: `${val.countryCode}${val.number}` });
                  }}
                  placeholder="600000000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Address Line 1 *</label>
              <input
                type="text"
                required
                value={addressForm.addressLine1}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Street address, P.O. box"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Address Line 2</label>
              <input
                type="text"
                value={addressForm.addressLine2}
                onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">City *</label>
                <input
                  type="text"
                  required
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Casablanca"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">State/Province</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="Casablanca-Settat"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Postal Code</label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="20000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Country *</label>
              <CountrySelect
                value={addressForm.country || 'United States'}
                onChange={(countryName) => {
                  setAddressForm({ ...addressForm, country: countryName });
                }}
                defaultPhoneCode={addressPhoneValue.countryCode}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={addressForm.isDefault}
                onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary/20"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">
                Set as default address
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addressLoading}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              >
                {addressLoading ? 'Saving...' : editingAddressId ? 'Update Address' : 'Add Address'}
              </button>
              <button
                type="button"
                onClick={handleCancelAddressForm}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address List */}
      {!showAddressForm && (
        <div className="space-y-3">
          {user.shippingAddresses && user.shippingAddresses.length > 0 ? (
            user.shippingAddresses.map((address: ShippingAddress) => (
              <div
                key={address.id}
                className={`rounded-2xl border p-4 transition ${
                  address.isDefault
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{address.fullName}</span>
                      {address.isDefault && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                    </p>
                    <p className="text-sm text-slate-600">
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p className="text-sm text-slate-600">{address.country}</p>
                    {address.phone && <p className="mt-1 text-sm text-slate-600">Phone: {address.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                      title="Edit address"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                      title="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <MapPin className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 font-semibold text-slate-900">No addresses yet</p>
              <p className="mt-1 text-sm text-slate-600">Add your first shipping address to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Password Change Section */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Change Password</h2>
          <p className="mt-1 text-sm text-slate-600">Update your account password with email verification</p>
        </div>
        {!showPasswordForm && (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <Lock className="h-4 w-4" />
            Change Password
          </button>
        )}
      </div>

      {showPasswordForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {passwordStep === 'request' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Email Verification Required</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    We'll send a 6-digit verification code to <strong>{user.email}</strong> to verify it's you.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRequestPasswordChange}
                  disabled={passwordLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
                >
                  {passwordLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPasswordForm}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {passwordStep === 'verify' && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <KeyRound className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Enter Verification Code</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Check your email for the 6-digit code we just sent to <strong>{user.email}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Verification Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-center text-2xl font-mono tracking-widest transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="000000"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">New Password *</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-2 pr-10 text-sm transition focus:outline-none',
                        newPassword ? passwordStrength.borderClass : 'border-slate-300',
                        newPassword ? passwordStrength.focusClass : 'focus:border-primary focus:ring-4 focus:ring-primary/20'
                      )}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              passwordStrength.level === 'weak' && 'w-1/3 bg-rose-500',
                              passwordStrength.level === 'good' && 'w-2/3 bg-amber-500',
                              passwordStrength.level === 'strong' && 'w-full bg-emerald-500'
                            )}
                          />
                        </div>
                        {passwordStrength.label && (
                          <span className={cn('text-xs font-medium', passwordStrength.colorClass)}>
                            {passwordStrength.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{PASSWORD_COMPLEXITY_MESSAGE}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-2 pr-10 text-sm transition focus:outline-none',
                        confirmPassword && passwordsMatch !== null
                          ? passwordsMatch
                            ? 'border-emerald-500 focus:ring-4 focus:ring-emerald-400/25 focus:border-emerald-600'
                            : 'border-rose-500 focus:ring-4 focus:ring-rose-500/25 focus:border-rose-600'
                          : 'border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/20'
                      )}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && passwordsMatch !== null && (
                    <p className={cn('text-xs font-medium', passwordsMatch ? 'text-emerald-600' : 'text-rose-600')}>
                      {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Must match the new password above</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading || !verificationCode || !newPassword || !confirmPassword || !passwordsMatch}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPasswordForm}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  </div>
)}

              {activeTab === 'b2b-upgrade' && isC2B && (
                <div className="space-y-6">
                  {b2bConversionStep === 'info' ? (
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
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
                          <div className="flex items-start gap-2">
                            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-red-900">
                              <strong>Important:</strong> Once converted to B2B, your company information cannot be changed. Please ensure all details are accurate before proceeding. Contact support if you need assistance.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomBusinessType(false);
                            setB2bConversionStep('form');
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-700 hover:shadow-xl"
                        >
                          Start Upgrade Process
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!user) return;

                        setB2bConversionLoading(true);
                        setError(null);
                        setStatusMessage(null);

                        try {
                          const formData = new FormData();
                          formData.append('companyName', b2bFormData.companyName);
                          formData.append('businessType', b2bFormData.businessType.trim());
                          if (b2bFormData.taxId) {
                            formData.append('taxId', b2bFormData.taxId);
                          }
                          if (b2bFormData.website) {
                            formData.append('website', b2bFormData.website);
                          }
                          if (b2bVerificationFile) {
                            formData.append('verificationFile', b2bVerificationFile);
                          }

                          const response = await usersApi.convertToB2B(user.id, formData);
                          await refresh();
                          setStatusMessage(response.message || 'Successfully converted to B2B account!');
                          handleTabChange('account');
                          setB2bConversionStep('info');
                          setB2bFormData({
                            companyName: '',
                            businessType: '',
                            taxId: '',
                            website: '',
                          });
                          setUseCustomBusinessType(false);
                          setB2bVerificationFile(null);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to convert to B2B account');
                        } finally {
                          setB2bConversionLoading(false);
                        }
                      }}
                      className="space-y-6"
                    >
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Company Information</h3>
                        <p className="text-sm text-slate-600 mb-6">Please provide your business details to complete the B2B conversion.</p>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
                              Company Name <span className="text-red-600">*</span>
                            </label>
                            <input
                              id="companyName"
                              type="text"
                              value={b2bFormData.companyName}
                              onChange={(e) => setB2bFormData({ ...b2bFormData, companyName: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Your company name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="businessType" className="block text-sm font-medium text-slate-700">
                              Business Type <span className="text-red-600">*</span>
                            </label>
                            <BusinessTypeSelect
                              value={
                                !useCustomBusinessType && isBusinessTypeOption(b2bFormData.businessType)
                                  ? b2bFormData.businessType
                                  : ''
                              }
                              onSelect={handleBusinessTypePresetSelect}
                              onSelectCustom={handleEnableCustomBusinessType}
                              placeholder="Select business type"
                            />
                            {useCustomBusinessType && (
                              <div className="grid gap-2 pt-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <input
                                  type="text"
                                  value={b2bFormData.businessType}
                                  onChange={(event) => handleCustomBusinessTypeChange(event.target.value)}
                                  className="h-12 w-full rounded-2xl border border-border/60 bg-white/95 px-4 text-sm font-semibold text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                                  placeholder="Enter your business type"
                                  required
                                />
                                <button
                                  type="button"
                                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                                  onClick={() => {
                                    setUseCustomBusinessType(false);
                                    setB2bFormData((prev) => ({ ...prev, businessType: '' }));
                                  }}
                                >
                                  Choose preset
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="taxId" className="block text-sm font-medium text-slate-700">
                              Tax ID
                            </label>
                            <input
                              id="taxId"
                              type="text"
                              value={b2bFormData.taxId}
                              onChange={(e) => setB2bFormData({ ...b2bFormData, taxId: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Tax ID"
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="website" className="block text-sm font-medium text-slate-700">
                              Company Website
                            </label>
                            <input
                              id="website"
                              type="text"
                              value={b2bFormData.website}
                              onChange={(e) => setB2bFormData({ ...b2bFormData, website: e.target.value })}
                              pattern="^[^\s]+\.[^\s]+$"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="example.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="verificationFile" className="block text-sm font-medium text-slate-700">
                              Business Verification Document
                            </label>
                            <input
                              id="verificationFile"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setB2bVerificationFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                            />
                            <p className="text-xs text-slate-500">Upload your business license, tax certificate, or other official business documentation (PDF, JPG, PNG - max 10MB)</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setB2bConversionStep('info');
                            setB2bFormData({
                              companyName: '',
                              businessType: '',
                              taxId: '',
                              website: '',
                            });
                            setB2bVerificationFile(null);
                          }}
                          className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={b2bConversionLoading}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {b2bConversionLoading ? 'Converting...' : 'Complete B2B Conversion'}
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  )}
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
