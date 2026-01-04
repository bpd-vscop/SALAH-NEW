import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Package, CheckCircle, AlertCircle, Truck, Upload, X } from 'lucide-react';
import { couponsApi } from '../api/coupons';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { usersApi, type ShippingAddressPayload } from '../api/users';
import { CountrySelect } from '../components/common/CountrySelect';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Coupon, Product } from '../types/api';
import { clearStoredCouponCode, readStoredCouponCode, writeStoredCouponCode } from '../utils/couponStorage';
import { formatCurrency } from '../utils/format';

type ShippingMethod = 'standard' | 'express' | 'overnight';
type PaymentMethod = 'credit-card' | 'paypal' | 'bank-transfer';

const shippingMethods = [
  { id: 'standard' as ShippingMethod, name: 'Standard Shipping', time: '5-7 business days', price: 0 },
  { id: 'express' as ShippingMethod, name: 'Express Shipping', time: '2-3 business days', price: 15 },
  { id: 'overnight' as ShippingMethod, name: 'Overnight Shipping', time: 'Next business day', price: 30 },
];

const paymentMethods = [
  { id: 'credit-card' as PaymentMethod, name: 'Credit Card', description: 'Pay with Visa, Mastercard, or Amex' },
  { id: 'paypal' as PaymentMethod, name: 'PayPal', description: 'Fast and secure payment' },
  { id: 'bank-transfer' as PaymentMethod, name: 'Bank Transfer', description: 'Direct bank payment' },
];

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

export const CheckoutPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const { items, clearCart } = useCart();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [eligibleSubtotal, setEligibleSubtotal] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('standard');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('credit-card');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Address, 2: Shipping, 3: Payment, 4: Review
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [requirementsSaving, setRequirementsSaving] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [requirementsFile, setRequirementsFile] = useState<File | null>(null);
  const [requirementsForm, setRequirementsForm] = useState({
    address: '',
    city: '',
    state: '',
    country: 'United States',
  });
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingPhoneValue, setShippingPhoneValue] = useState<PhoneNumberInputValue>({
    countryCode: '+1',
    number: '',
  });
  const [shippingForm, setShippingForm] = useState<ShippingAddressPayload>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    isDefault: true,
  });
  const navigate = useNavigate();
  const scrollLockRef = useRef<{
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
    htmlOverflow: string;
    scrollY: number;
  } | null>(null);
  const lastValidatedSignatureRef = useRef('');
  const storedCouponLoadedRef = useRef(false);
  const isCheckoutModalOpen = showRequirementsModal || showShippingModal;

  // Auto-select first address if available
  useEffect(() => {
    if (user?.shippingAddresses && user.shippingAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(user.shippingAddresses[0].id || '0');
    }
  }, [user, selectedAddress]);

  useEffect(() => {
    if (!isCheckoutModalOpen || scrollLockRef.current) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    scrollLockRef.current = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      scrollY,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      const previous = scrollLockRef.current;
      if (!previous) {
        return;
      }
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, previous.scrollY);
      scrollLockRef.current = null;
    };
  }, [isCheckoutModalOpen]);

  useEffect(() => {
    const missing = items.filter((line) => !productMap[line.productId]).map((line) => line.productId);
    if (!missing.length) {
      return;
    }
    const load = async () => {
      const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
      const next: Record<string, Product> = {};
      responses.forEach((result) => {
        if (result.status === 'fulfilled') {
          next[result.value.product.id] = result.value.product;
        }
      });
      setProductMap((current) => ({ ...current, ...next }));
    };
    void load();
  }, [items, productMap]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, line) => {
      const price = productMap[line.productId]?.price ?? 0;
      return sum + price * line.quantity;
    }, 0);
  }, [items, productMap]);

  const cartSignature = useMemo(
    () =>
      items
        .map((line) => `${line.productId}:${line.quantity}`)
        .sort()
        .join('|'),
    [items]
  );

  const discountedSubtotal = useMemo(
    () => Math.max(0, subtotal - couponDiscount),
    [subtotal, couponDiscount]
  );

  const shippingCost = useMemo(() => {
    const method = shippingMethods.find(m => m.id === selectedShipping);
    return method?.price ?? 0;
  }, [selectedShipping]);

  const tax = useMemo(() => {
    return discountedSubtotal * 0.1; // 10% tax
  }, [discountedSubtotal]);

  const total = discountedSubtotal + shippingCost + tax;

  const selectedAddressData = useMemo(() => {
    return user?.shippingAddresses?.find((addr) => addr.id === selectedAddress);
  }, [user, selectedAddress]);

  const validateCoupon = useCallback(async (code: string, silent = false) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      if (!silent) setCouponError('Enter a coupon code.');
      return;
    }
    if (!items.length) {
      if (!silent) setCouponError('Your cart is empty.');
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setEligibleSubtotal(0);
      return;
    }
    setApplyingCoupon(true);
    try {
      const response = await couponsApi.validate({
        code: normalizedCode,
        items: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      setAppliedCoupon(response.coupon);
      setCouponDiscount(response.discountAmount);
      setEligibleSubtotal(response.eligibleSubtotal);
      setCouponError(null);
      setCouponCode(response.coupon.code);
      writeStoredCouponCode(response.coupon.code);
      lastValidatedSignatureRef.current = cartSignature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to apply coupon.';
      setCouponError(message);
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setEligibleSubtotal(0);
      clearStoredCouponCode();
      if (!silent) {
        setCouponCode(normalizedCode);
      }
    } finally {
      setApplyingCoupon(false);
    }
  }, [cartSignature, items]);

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setEligibleSubtotal(0);
    setCouponError(null);
    setCouponCode('');
    lastValidatedSignatureRef.current = '';
    clearStoredCouponCode();
  };

  useEffect(() => {
    if (storedCouponLoadedRef.current) {
      return;
    }
    const storedCode = readStoredCouponCode();
    if (storedCode) {
      setCouponCode(storedCode);
      void validateCoupon(storedCode, true);
    }
    storedCouponLoadedRef.current = true;
  }, [validateCoupon]);

  useEffect(() => {
    if (!appliedCoupon || applyingCoupon) return;
    if (cartSignature === lastValidatedSignatureRef.current) return;
    void validateCoupon(appliedCoupon.code, true);
  }, [appliedCoupon, applyingCoupon, cartSignature, validateCoupon]);

  const isB2BUser = user?.clientType === 'B2B';
  const hasCompanyAddress = Boolean(user?.company?.address && user.company.address.trim());
  const hasVerificationFile = Boolean(user?.verificationFileUrl);
  const needsCompanyAddress = Boolean(isB2BUser && !hasCompanyAddress);
  const needsVerification = Boolean(isB2BUser && !hasVerificationFile);
  const needsB2BRequirements = needsCompanyAddress || needsVerification;
  const hasShippingAddress = Boolean(user?.shippingAddresses && user.shippingAddresses.length > 0);
  const needsShippingAddress = !hasShippingAddress;
  const needsShippingAddressAfterB2B = !needsB2BRequirements && needsShippingAddress;
  const missingRequirementLabels: string[] = [];
  if (needsCompanyAddress) missingRequirementLabels.push('company address');
  if (needsVerification) missingRequirementLabels.push('verification document');
  const missingRequirementsText =
    missingRequirementLabels.length > 1
      ? `${missingRequirementLabels.slice(0, -1).join(', ')} and ${missingRequirementLabels[missingRequirementLabels.length - 1]}`
      : missingRequirementLabels[0] ?? '';
  const isRequirementsUnitedStates = ['united states', 'united states of america'].includes(
    requirementsForm.country.trim().toLowerCase()
  );
  const isShippingUnitedStates = ['united states', 'united states of america'].includes(
    (shippingForm.country ?? '').trim().toLowerCase()
  );

  useEffect(() => {
    if ((needsB2BRequirements || needsShippingAddressAfterB2B) && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [needsB2BRequirements, needsShippingAddressAfterB2B, currentStep]);

  const steps = [
    { label: 'Cart', active: false, completed: true },
    { label: 'Address', active: currentStep === 1, completed: currentStep > 1 },
    { label: 'Shipping', active: currentStep === 2, completed: currentStep > 2 },
    { label: 'Payment', active: currentStep === 3, completed: currentStep > 3 },
    { label: 'Confirm', active: currentStep === 4, completed: false },
    { label: 'Complete', active: false, completed: false },
  ];

  if (!user) {
    return (
      <SiteLayout>
        <div className="bg-slate-50 min-h-screen py-8">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Required</h2>
              <p className="text-slate-600 mb-6">Please login to continue with checkout.</p>
              <button
                onClick={() => navigate('/login', { state: { from: '/checkout' } })}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const validateCartForCheckout = (): { valid: boolean; error?: string } => {
    if (isB2BUser && needsB2BRequirements) {
      const missingText = missingRequirementsText ? ` Missing: ${missingRequirementsText}.` : '';
      return {
        valid: false,
        error: `Please complete your company profile before checkout.${missingText}`
      };
    }

    // Check if any product in cart requires B2B
    const requiresB2BProducts = items
      .map(item => productMap[item.productId])
      .filter(product => product?.requiresB2B === true);

    if (requiresB2BProducts.length > 0 && !isB2BUser) {
      // C2B user trying to buy B2B products
      return {
        valid: false,
        error: 'Some products in your cart require a B2B account. Please switch your account to B2B type in your dashboard settings to purchase these products.'
      };
    }

    if (needsShippingAddressAfterB2B) {
      return {
        valid: false,
        error: 'Please add a shipping address before checkout.'
      };
    }

    return { valid: true };
  };

  const placeOrder = async () => {
    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }
    if (needsShippingAddressAfterB2B) {
      setError('Please add a shipping address before checkout.');
      openShippingModal();
      return;
    }
    if (!selectedAddress) {
      setError('Please select a shipping address.');
      return;
    }

    // Validate cart against user account type and verification
    const validation = validateCartForCheckout();
    if (!validation.valid) {
      setError(validation.error || 'Unable to place order');
      return;
    }

    setPlacingOrder(true);
    setError(null);
    try {
      const couponPayload = appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {};
      await ordersApi.create({
        products: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        ...couponPayload,
      });
      await clearCart();
      clearStoredCouponCode();
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setEligibleSubtotal(0);
      setCouponError(null);
      setCouponCode('');
      setStatusMessage('Order placed successfully! Redirecting to products...');
      setTimeout(() => {
        navigate('/products');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const canProceedToNextStep = () => {
    if (needsB2BRequirements || needsShippingAddressAfterB2B) return false;
    if (currentStep === 1) return !!selectedAddress;
    if (currentStep === 2) return !!selectedShipping;
    if (currentStep === 3) return !!selectedPayment;
    return false;
  };

  const resetRequirementsForm = () => {
    setRequirementsForm({
      address: '',
      city: '',
      state: '',
      country: 'United States',
    });
    setRequirementsFile(null);
    setRequirementsError(null);
  };

  const openRequirementsModal = () => {
    resetRequirementsForm();
    setShowRequirementsModal(true);
  };

  const closeRequirementsModal = () => {
    if (requirementsSaving) {
      return;
    }
    setShowRequirementsModal(false);
    setRequirementsError(null);
  };

  const handleRequirementsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setRequirementsFile(null);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setRequirementsError('Please upload a PDF, JPG, or PNG file');
      setRequirementsFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setRequirementsError('File size must be less than 5MB');
      setRequirementsFile(null);
      return;
    }

    setRequirementsError(null);
    setRequirementsFile(file);
  };

  const handleSaveRequirements = async () => {
    if (!user) {
      return;
    }

    const trimmedAddress = requirementsForm.address.trim();
    const trimmedCity = requirementsForm.city.trim();
    const trimmedState = requirementsForm.state.trim();
    const trimmedCountry = requirementsForm.country.trim();

    if (needsCompanyAddress && (!trimmedAddress || !trimmedCity || !trimmedState || !trimmedCountry)) {
      setRequirementsError('Company address, country, state, and city are required.');
      return;
    }

    if (needsVerification && !requirementsFile) {
      setRequirementsError('Please upload a verification document.');
      return;
    }

    setRequirementsSaving(true);
    setRequirementsError(null);

    try {
      const formData = new FormData();
      if (needsCompanyAddress) {
        const formattedAddress = `${trimmedAddress}, ${trimmedCity}, ${trimmedState}, ${trimmedCountry}`;
        formData.append('companyAddress', formattedAddress);
      }
      if (needsVerification && requirementsFile) {
        formData.append('verificationFile', requirementsFile);
      }

      await usersApi.update(user.id, formData);
      await refresh();

      setShowRequirementsModal(false);
      resetRequirementsForm();
      setStatusMessage('Profile updated. You can continue checkout.');
      setError(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setRequirementsError(err instanceof Error ? err.message : 'Failed to update your profile.');
    } finally {
      setRequirementsSaving(false);
    }
  };

  const resetShippingForm = () => {
    setShippingForm({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
      isDefault: true,
    });
    setShippingPhoneValue({ countryCode: '+1', number: '' });
    setShippingError(null);
  };

  const openShippingModal = () => {
    resetShippingForm();
    setShowShippingModal(true);
  };

  const closeShippingModal = () => {
    if (shippingSaving) {
      return;
    }
    setShowShippingModal(false);
    setShippingError(null);
  };

  const handleSaveShippingAddress = async () => {
    if (!user) {
      return;
    }

    const trimmedFullName = (shippingForm.fullName ?? '').trim();
    const trimmedPhoneNumber = shippingPhoneValue.number.trim();
    const trimmedAddress = (shippingForm.addressLine1 ?? '').trim();
    const trimmedCity = (shippingForm.city ?? '').trim();
    const trimmedCountry = (shippingForm.country ?? '').trim();

    if (!trimmedFullName || !trimmedPhoneNumber || !trimmedAddress || !trimmedCity || !trimmedCountry) {
      setShippingError('Full name, phone, address, city, and country are required.');
      return;
    }

    setShippingSaving(true);
    setShippingError(null);

    try {
      const payload: ShippingAddressPayload = {
        fullName: trimmedFullName,
        phone: `${shippingPhoneValue.countryCode}${trimmedPhoneNumber}`,
        addressLine1: trimmedAddress,
        addressLine2: shippingForm.addressLine2?.trim() || undefined,
        city: trimmedCity,
        state: shippingForm.state?.trim() || undefined,
        postalCode: shippingForm.postalCode?.trim() || undefined,
        country: trimmedCountry,
        isDefault: true,
      };

      const response = await usersApi.addShippingAddress(user.id, payload);
      await refresh();

      const defaultAddress = response.user.shippingAddresses?.find((address) => address.isDefault);
      const fallbackAddress = response.user.shippingAddresses?.[response.user.shippingAddresses.length - 1];
      const nextAddressId = defaultAddress?.id || fallbackAddress?.id;
      if (nextAddressId) {
        setSelectedAddress(nextAddressId);
      }

      setShowShippingModal(false);
      resetShippingForm();
      setStatusMessage('Shipping address saved. You can continue checkout.');
      setError(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setShippingError(err instanceof Error ? err.message : 'Failed to save shipping address.');
    } finally {
      setShippingSaving(false);
    }
  };

  const normalizedError = error?.toLowerCase() ?? '';
  const needsProfileCompletion =
    normalizedError.includes('company profile') ||
    normalizedError.includes('company address') ||
    normalizedError.includes('verification document') ||
    normalizedError.includes('verification file');
  const needsB2BSwitch =
    normalizedError.includes('switch your account to b2b') || normalizedError.includes('b2b account');
  const needsShippingAddressCompletion = normalizedError.includes('shipping address');
  const requirementsAddressComplete =
    !needsCompanyAddress ||
    (requirementsForm.address.trim() &&
      requirementsForm.city.trim() &&
      requirementsForm.state.trim() &&
      requirementsForm.country.trim());
  const requirementsVerificationComplete = !needsVerification || Boolean(requirementsFile);
  const canSaveRequirements = Boolean(requirementsAddressComplete && requirementsVerificationComplete);
  const shippingFormComplete =
    (shippingForm.fullName ?? '').trim() &&
    shippingPhoneValue.number.trim() &&
    (shippingForm.addressLine1 ?? '').trim() &&
    (shippingForm.city ?? '').trim() &&
    (shippingForm.country ?? '').trim();
  const canSaveShippingAddress = Boolean(shippingFormComplete);

  return (
    <SiteLayout>
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-[1400px]">
          {/* Progress Steps */}
          <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`text-sm font-medium ${
                        step.completed
                          ? 'text-green-600'
                          : step.active
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.completed && <CheckCircle className="inline h-4 w-4 mr-1" />}
                      {step.label}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-4 text-slate-400">{'>'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Success Message */}
          {statusMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">{statusMessage}</p>
            </div>
          )}

          {isB2BUser && needsB2BRequirements && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Complete your company profile before checkout.
                    </p>
                    {missingRequirementsText && (
                      <p className="text-xs text-amber-800 mt-1">
                        Missing: {missingRequirementsText}.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex md:justify-end">
                  <button
                    type="button"
                    onClick={openRequirementsModal}
                    className="relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    <span aria-hidden="true" className="fill-now-wave" />
                    <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                    <span className="relative z-10">Fill now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  {/* Show profile completion link for B2B users missing requirements */}
                  {needsProfileCompletion && user?.clientType === 'B2B' && (
                    <button
                      type="button"
                      onClick={openRequirementsModal}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                    >
                      Complete profile now
                    </button>
                  )}
                  {needsShippingAddressCompletion && needsShippingAddressAfterB2B && (
                    <button
                      type="button"
                      onClick={openShippingModal}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                    >
                      Add shipping address
                    </button>
                  )}
                  {/* Show dashboard link for C2B users who need to switch to B2B */}
                  {needsB2BSwitch && user?.clientType === 'C2B' && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?tab=account&section=account-type')}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                    >
                      Go to Dashboard to switch account type
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Step 1: Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setCurrentStep(1)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      currentStep > 1 ? 'bg-green-100 text-green-600' : 'bg-red-600 text-white'
                    }`}>
                      {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">1. Shipping Address</h2>
                  </div>
                  {currentStep > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentStep(1);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 1 && (
                  <div className="p-6 border-t border-slate-200">
                    {needsB2BRequirements ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Complete your company profile to continue checkout.
                        </p>
                        {missingRequirementsText && (
                          <p className="text-xs text-amber-800 mt-1">
                            Missing: {missingRequirementsText}.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={openRequirementsModal}
                          className="mt-4 relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                          <span aria-hidden="true" className="fill-now-wave" />
                          <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                          <span className="relative z-10">Fill now</span>
                        </button>
                      </div>
                    ) : needsShippingAddressAfterB2B ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Add a shipping address to continue checkout.
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                          We will use it for delivery and order updates.
                        </p>
                        <button
                          type="button"
                          onClick={openShippingModal}
                          className="mt-4 relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                          <span aria-hidden="true" className="fill-now-wave" />
                          <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                          <span className="relative z-10">Add shipping address</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {user.shippingAddresses && user.shippingAddresses.length > 0 ? (
                          <div className="space-y-3">
                            {user.shippingAddresses.map((address, index) => (
                              <label
                                key={address.id || index}
                                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                                  selectedAddress === (address.id || String(index))
                                    ? 'border-red-600 bg-red-50'
                                    : 'border-slate-200 hover:border-red-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="address"
                                  checked={selectedAddress === (address.id || String(index))}
                                  onChange={() => setSelectedAddress(address.id || String(index))}
                                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{address.fullName}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    {address.addressLine1}
                                    {address.addressLine2 && `, ${address.addressLine2}`}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {address.city}, {address.state} {address.postalCode}
                                  </p>
                                  <p className="text-sm text-slate-600">{address.country}</p>
                                  <p className="text-sm text-slate-600 mt-1">Phone: {address.phone}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-900">
                              Add a shipping address to continue checkout.
                            </p>
                            <p className="text-xs text-amber-800 mt-1">
                              We will use it for delivery and order updates.
                            </p>
                            <button
                              type="button"
                              onClick={openShippingModal}
                              className="mt-4 relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                            >
                              <span aria-hidden="true" className="fill-now-wave" />
                              <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                              <span className="relative z-10">Add shipping address</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => currentStep === 1 && canProceedToNextStep() && setCurrentStep(2)}
                          disabled={!canProceedToNextStep()}
                          className="mt-6 w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Continue to Shipping
                        </button>
                      </>
                    )}
                  </div>
                )}

                {currentStep > 1 && selectedAddressData && (
                  <div className="px-6 pb-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{selectedAddressData.fullName}</p>
                    <p>{selectedAddressData.addressLine1}, {selectedAddressData.city}, {selectedAddressData.state} {selectedAddressData.postalCode}</p>
                  </div>
                )}
              </div>

              {/* Step 2: Shipping Method */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    !needsB2BRequirements && !needsShippingAddressAfterB2B && currentStep > 1 && setCurrentStep(2)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      currentStep > 2 ? 'bg-green-100 text-green-600' : currentStep === 2 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {currentStep > 2 ? <CheckCircle className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">2. Shipping Method</h2>
                  </div>
                  {currentStep > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentStep(2);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 2 && (
                  <div className="p-6 border-t border-slate-200">
                    <div className="space-y-3">
                      {shippingMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${
                            selectedShipping === method.id
                              ? 'border-red-600 bg-red-50'
                              : 'border-slate-200 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              checked={selectedShipping === method.id}
                              onChange={() => setSelectedShipping(method.id)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{method.name}</p>
                              <p className="text-sm text-slate-600">{method.time}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {method.price === 0 ? 'FREE' : formatCurrency(method.price)}
                          </p>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                )}

                {currentStep > 2 && (
                  <div className="px-6 pb-4 text-sm text-slate-600">
                    <p>{shippingMethods.find(m => m.id === selectedShipping)?.name} - {shippingMethods.find(m => m.id === selectedShipping)?.time}</p>
                  </div>
                )}
              </div>

              {/* Step 3: Payment Method */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    !needsB2BRequirements && !needsShippingAddressAfterB2B && currentStep > 2 && setCurrentStep(3)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      currentStep > 3 ? 'bg-green-100 text-green-600' : currentStep === 3 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {currentStep > 3 ? <CheckCircle className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">3. Payment Method</h2>
                  </div>
                  {currentStep > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentStep(3);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 3 && (
                  <div className="p-6 border-t border-slate-200">
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                            selectedPayment === method.id
                              ? 'border-red-600 bg-red-50'
                              : 'border-slate-200 hover:border-red-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            checked={selectedPayment === method.id}
                            onChange={() => setSelectedPayment(method.id)}
                            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{method.name}</p>
                            <p className="text-sm text-slate-600">{method.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                      >
                        Review Order
                      </button>
                    </div>
                  </div>
                )}

                {currentStep > 3 && (
                  <div className="px-6 pb-4 text-sm text-slate-600">
                    <p>{paymentMethods.find(m => m.id === selectedPayment)?.name}</p>
                  </div>
                )}
              </div>

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Package className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">4. Review & Confirm</h2>
                  </div>

                  <div className="space-y-4">
                    {items.map((line) => {
                      const product = productMap[line.productId];
                      return (
                        <div key={line.productId} className="flex gap-4 pb-4 border-b border-slate-200">
                          <img
                            src={product?.images?.[0] ?? 'https://placehold.co/80x80?text=Item'}
                            alt={product?.name ?? ''}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">{product?.name ?? 'Loading...'}</h3>
                            <p className="text-sm text-slate-600">Quantity: {line.quantity}</p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">
                              {formatCurrency((product?.price ?? 0) * line.quantity)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Validation Warning - shown before place order */}
                  {(() => {
                    const validation = validateCartForCheckout();
                    if (!validation.valid) {
                      const lowerMessage = (validation.error ?? '').toLowerCase();
                      const isC2BUserNeedsB2B =
                        user?.clientType === 'C2B' &&
                        (lowerMessage.includes('switch your account to b2b') || lowerMessage.includes('b2b account'));
                      const isB2BUserNeedsProfile = isB2BUser && needsB2BRequirements;
                      const isShippingAddressMissing =
                        needsShippingAddressAfterB2B && lowerMessage.includes('shipping address');

                      return (
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-900 mb-2">Action Required</p>
                              <p className="text-sm text-amber-800 mb-3">{validation.error}</p>
                              {isB2BUserNeedsProfile && (
                                <button
                                  type="button"
                                  onClick={openRequirementsModal}
                                  className="relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                >
                                  <span aria-hidden="true" className="fill-now-wave" />
                                  <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                                  <span className="relative z-10">Fill now</span>
                                </button>
                              )}
                              {isShippingAddressMissing && (
                                <button
                                  type="button"
                                  onClick={openShippingModal}
                                  className="relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                >
                                  <span aria-hidden="true" className="fill-now-wave" />
                                  <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                                  <span className="relative z-10">Add shipping address</span>
                                </button>
                              )}
                              {isC2BUserNeedsB2B && (
                                <button
                                  type="button"
                                  onClick={() => navigate('/dashboard?tab=account&section=account-type')}
                                  className="text-sm font-semibold text-amber-900 hover:text-amber-950 underline"
                                >
                                  Go to Dashboard to switch account type
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={placeOrder}
                      disabled={placingOrder}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {placingOrder ? 'Placing Order...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="bg-white rounded-lg shadow-sm p-6 h-fit sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Coupon</h3>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter your coupon here"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => void validateCoupon(couponCode)}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="px-4 h-9 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {applyingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-xs text-red-600">{couponError}</p>
                )}
                {appliedCoupon && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <span>
                      Applied: <strong>{appliedCoupon.code}</strong>
                      {eligibleSubtotal > 0 && eligibleSubtotal < subtotal && (
                        <span className="ml-2 text-emerald-600">
                          ({formatCurrency(eligibleSubtotal)} eligible)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Discount ({appliedCoupon.code}):</span>
                    <span className="font-semibold text-emerald-600">
                      -{formatCurrency(couponDiscount)}
                    </span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal after discount:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(discountedSubtotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping:</span>
                  <span className="font-semibold text-slate-900">
                    {shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax (10%):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="font-semibold text-slate-900">Total:</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-4 p-3 bg-slate-50 rounded-lg">
                <p>- Secure checkout</p>
                <p>- All prices in USD</p>
                <p>- Free returns within 30 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete B2B Requirements Modal */}
      {showRequirementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Complete company profile</h3>
              <button
                type="button"
                onClick={closeRequirementsModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                To continue checkout, please provide the missing information below.
              </p>

              {requirementsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{requirementsError}</p>
                </div>
              )}

              {needsCompanyAddress && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Company address</h4>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Street address
                    <input
                      type="text"
                      value={requirementsForm.address}
                      onChange={(event) =>
                        setRequirementsForm((prev) => ({ ...prev, address: event.target.value }))
                      }
                      placeholder="Street address"
                      disabled={requirementsSaving}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <span>Country</span>
                      <CountrySelect
                        value={requirementsForm.country}
                        onChange={(value) => setRequirementsForm((prev) => ({ ...prev, country: value }))}
                        placeholder="Select country"
                        searchPlaceholder="Search countries..."
                        placement="auto"
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <span>State</span>
                      {isRequirementsUnitedStates ? (
                        <CountrySelect
                          value={requirementsForm.state}
                          onChange={(value) => setRequirementsForm((prev) => ({ ...prev, state: value }))}
                          options={US_STATES}
                          placeholder="Select state"
                          searchPlaceholder="Search states..."
                          placement="auto"
                          className="w-full"
                        />
                      ) : (
                        <input
                          type="text"
                          value={requirementsForm.state}
                          onChange={(event) =>
                            setRequirementsForm((prev) => ({ ...prev, state: event.target.value }))
                          }
                          placeholder="State / Province"
                          disabled={requirementsSaving}
                          className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <span>City</span>
                      <input
                        type="text"
                        value={requirementsForm.city}
                        onChange={(event) =>
                          setRequirementsForm((prev) => ({ ...prev, city: event.target.value }))
                        }
                        placeholder="City"
                        disabled={requirementsSaving}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {needsVerification && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Verification document</h4>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleRequirementsFileChange}
                      disabled={requirementsSaving}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                      requirementsSaving
                        ? 'border-slate-300 bg-slate-50'
                        : 'border-slate-300 hover:border-red-400 hover:bg-red-50'
                    }`}>
                      <Upload className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {requirementsFile ? requirementsFile.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-slate-500">PDF, JPG, or PNG (max 5MB)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeRequirementsModal}
                disabled={requirementsSaving}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRequirements}
                disabled={requirementsSaving || !canSaveRequirements}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requirementsSaving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shipping Address Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add shipping address</h3>
              <button
                type="button"
                onClick={closeShippingModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Add your shipping details to continue checkout.
              </p>

              {shippingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{shippingError}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Full name
                  <input
                    type="text"
                    value={shippingForm.fullName ?? ''}
                    onChange={(event) =>
                      setShippingForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    placeholder="Full name"
                    disabled={shippingSaving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <span>Phone</span>
                  <PhoneNumberInput
                    value={shippingPhoneValue}
                    onChange={(value) => {
                      setShippingPhoneValue(value);
                      setShippingForm((prev) => ({ ...prev, phone: `${value.countryCode}${value.number}` }));
                    }}
                    disabled={shippingSaving}
                    required
                    placeholder="600000000"
                    placement="auto"
                  />
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Address line 1
                <input
                  type="text"
                  value={shippingForm.addressLine1 ?? ''}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, addressLine1: event.target.value }))
                  }
                  placeholder="Street address, P.O. box"
                  disabled={shippingSaving}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Address line 2
                <input
                  type="text"
                  value={shippingForm.addressLine2 ?? ''}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, addressLine2: event.target.value }))
                  }
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  disabled={shippingSaving}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <span>Country</span>
                <CountrySelect
                  value={shippingForm.country || 'United States'}
                  onChange={(value) => setShippingForm((prev) => ({ ...prev, country: value }))}
                  defaultPhoneCode={shippingPhoneValue.countryCode}
                  placement="auto"
                  className="w-full"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  State / Province
                  {isShippingUnitedStates ? (
                    <CountrySelect
                      value={shippingForm.state || ''}
                      onChange={(value) => setShippingForm((prev) => ({ ...prev, state: value }))}
                      options={US_STATES}
                      placeholder="Select state"
                      searchPlaceholder="Search states..."
                      placement="auto"
                      className="w-full"
                    />
                  ) : (
                    <input
                      type="text"
                      value={shippingForm.state ?? ''}
                      onChange={(event) =>
                        setShippingForm((prev) => ({ ...prev, state: event.target.value }))
                      }
                      placeholder="State / Province"
                      disabled={shippingSaving}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  City
                  <input
                    type="text"
                    value={shippingForm.city ?? ''}
                    onChange={(event) =>
                      setShippingForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                    placeholder="City"
                    disabled={shippingSaving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Postal code
                  <input
                    type="text"
                    value={shippingForm.postalCode ?? ''}
                    onChange={(event) =>
                      setShippingForm((prev) => ({ ...prev, postalCode: event.target.value }))
                    }
                    placeholder="Postal code"
                    disabled={shippingSaving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeShippingModal}
                disabled={shippingSaving}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShippingAddress}
                disabled={shippingSaving || !canSaveShippingAddress}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shippingSaving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fill-now-wave {
          0% {
            transform: scale(1);
            opacity: 0.45;
          }
          70% {
            transform: scale(1.35);
            opacity: 0;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        .fill-now-wave {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 2px solid rgba(239, 68, 68, 0.45);
          animation: fill-now-wave 2.6s ease-out infinite;
          pointer-events: none;
        }

        .fill-now-wave-delay {
          animation-delay: 1.3s;
        }

        @media (prefers-reduced-motion: reduce) {
          .fill-now-wave {
            animation: none;
          }
        }
      `}</style>
    </SiteLayout>
  );
};
