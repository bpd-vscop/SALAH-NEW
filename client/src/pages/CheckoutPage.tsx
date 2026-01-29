import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  type Stripe,
  type StripeCardCvcElementChangeEvent,
  type StripeCardExpiryElementChangeEvent,
  type StripeCardNumberElementChangeEvent,
  type StripeElements,
} from '@stripe/stripe-js';
import { MapPin, CreditCard, Package, CheckCircle, AlertCircle, Truck, Upload, X } from 'lucide-react';
import { couponsApi } from '../api/coupons';
import { ordersApi } from '../api/orders';
import { paymentsApi, type PaymentConfigResponse } from '../api/payments';
import { productsApi } from '../api/products';
import { taxRatesApi } from '../api/taxRates';
import { usersApi, type BillingAddressPayload, type ShippingAddressPayload } from '../api/users';
import { shippingApi, type ShippingRate } from '../api/shipping';
import { CountrySelect } from '../components/common/CountrySelect';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../components/common/PhoneInput';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Coupon, Product } from '../types/api';
import { clearStoredCouponCode, readStoredCouponCode, writeStoredCouponCode } from '../utils/couponStorage';
import { initMockAffirm, loadAffirm } from '../utils/affirm';
import { formatCurrency } from '../utils/format';
import { getEffectivePrice } from '../utils/productStatus';

type ShippingMethod = 'standard' | 'express' | 'overnight';
type ActivePaymentMethod = 'paypal' | 'card' | 'affirm';

/* ── PayPal Checkout Button ───────────────────────────────────── */
interface PayPalCheckoutButtonProps {
  amount: number;
  disabled?: boolean;
  onSuccess: (paypalOrderId: string) => void;
  onError: (message: string) => void;
}

function PayPalCheckoutButton({ amount, disabled, onSuccess, onError }: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const latestAmount = useRef(amount);
  latestAmount.current = amount;

  useEffect(() => {
    const pp = (window as unknown as Record<string, unknown>).paypal as
      | { Buttons: (opts: Record<string, unknown>) => { render: (el: HTMLElement) => void } }
      | undefined;
    if (!pp || !containerRef.current || renderedRef.current) return;
    renderedRef.current = true;

    pp.Buttons({
      style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'paypal', tagline: false, height: 45 },
      createOrder: async () => {
        try {
          const res = await paymentsApi.createPaypalOrder(latestAmount.current);
          return res.paypalOrderId;
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to create PayPal order');
          throw err;
        }
      },
      onApprove: async (data: { orderID: string }) => {
        try {
          const capture = await paymentsApi.capturePaypalOrder(data.orderID);
          if (capture.success) {
            onSuccess(data.orderID);
          } else {
            onError('PayPal payment was not completed');
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to capture PayPal payment');
        }
      },
      onError: (err: unknown) => {
        onError(err instanceof Error ? err.message : 'PayPal encountered an error');
      },
    }).render(containerRef.current);
  }, [onSuccess, onError]);

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <div ref={containerRef} id="paypal-button-container" />
    </div>
  );
}

type StripeElementChangeEvent =
  | StripeCardNumberElementChangeEvent
  | StripeCardExpiryElementChangeEvent
  | StripeCardCvcElementChangeEvent;

interface StripeCardFieldsProps {
  holderName: string;
  onHolderNameChange: (value: string) => void;
  onStripeReady: (stripe: Stripe | null, elements: StripeElements | null) => void;
  onFieldChange: (field: 'number' | 'expiry' | 'cvc', complete: boolean, error?: string | null) => void;
  disabled?: boolean;
  errorMessage?: string | null;
}

function StripeCardFields({
  holderName,
  onHolderNameChange,
  onStripeReady,
  onFieldChange,
  disabled,
  errorMessage,
}: StripeCardFieldsProps) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    onStripeReady(stripe, elements);
  }, [stripe, elements, onStripeReady]);

  const handleChange =
    (field: 'number' | 'expiry' | 'cvc') =>
      (event: StripeElementChangeEvent) => {
        onFieldChange(field, event.complete, event.error?.message ?? null);
      };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Card details</h3>
      <div className="grid gap-4">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Card holder name</span>
          <input
            type="text"
            value={holderName}
            onChange={(event) => onHolderNameChange(event.target.value)}
            placeholder="Name on card"
            autoComplete="cc-name"
            disabled={disabled}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block">Card number</span>
          <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
            <CardNumberElement
              options={{ ...STRIPE_ELEMENT_BASE_OPTIONS, showIcon: true, disabled }}
              onChange={handleChange('number')}
              className="w-full"
            />
          </div>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">Expiration</span>
            <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
              <CardExpiryElement
                options={{ ...STRIPE_ELEMENT_BASE_OPTIONS, disabled }}
                onChange={handleChange('expiry')}
                className="w-full"
              />
            </div>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">CVC</span>
            <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
              <CardCvcElement
                options={{ ...STRIPE_ELEMENT_BASE_OPTIONS, disabled }}
                onChange={handleChange('cvc')}
                className="w-full"
              />
            </div>
          </label>
        </div>
      </div>
      {errorMessage && (
        <p className="mt-3 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}

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

const MAX_VISIBLE_SHIPPING_RATES = 5;
const SHIPPING_RATE_ROW_MIN_HEIGHT = 76;
const SHIPPING_RATE_GAP = 12;
const SHIPPING_RATE_LIST_MAX_HEIGHT =
  MAX_VISIBLE_SHIPPING_RATES * SHIPPING_RATE_ROW_MIN_HEIGHT +
  (MAX_VISIBLE_SHIPPING_RATES - 1) * SHIPPING_RATE_GAP;
const CARD_METHOD_LABEL = 'Card';
const STRIPE_ELEMENT_BASE_OPTIONS = {
  style: {
    base: {
      color: '#0f172a',
      fontFamily: 'inherit',
      fontSize: '14px',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#dc2626' },
  },
};

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
  const [taxRate, setTaxRate] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('standard');
  const [selectedPayment, setSelectedPayment] = useState<ActivePaymentMethod | ''>('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Address, 2: Shipping, 3: Payment, 4: Review
  // Payment gateway config
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [paypalSdkReady, setPaypalSdkReady] = useState(false);
  const [paypalSdkError, setPaypalSdkError] = useState<string | null>(null);
  const [completedPaypalOrderId, setCompletedPaypalOrderId] = useState<string | null>(null);
  const [affirmSdkReady, setAffirmSdkReady] = useState(false);
  const [affirmSdkError, setAffirmSdkError] = useState<string | null>(null);
  const [affirmProcessing, setAffirmProcessing] = useState(false);
  const [affirmError, setAffirmError] = useState<string | null>(null);
  const [completedAffirmTransactionId, setCompletedAffirmTransactionId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    holderName: '',
  });
  const [cardFieldState, setCardFieldState] = useState({
    numberComplete: false,
    expiryComplete: false,
    cvcComplete: false,
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  // Carrier rates from ShipEngine
  const [carrierRates, setCarrierRates] = useState<ShippingRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [selectedRatePrice, setSelectedRatePrice] = useState<number>(0);
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
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingForm, setBillingForm] = useState<BillingAddressPayload>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
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
  const isCheckoutModalOpen = showRequirementsModal || showShippingModal || showBillingModal;

  // Auto-select first address if available
  useEffect(() => {
    if (user?.shippingAddresses && user.shippingAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(user.shippingAddresses[0].id || '0');
    }
  }, [user, selectedAddress]);

  // Fetch payment configuration from server (locked to .env)
  useEffect(() => {
    let cancelled = false;
    paymentsApi.getConfig().then((config) => {
      if (cancelled) return;
      setPaymentConfig(config);
      // Auto-select PayPal if configured, otherwise default to Card
      if (config.methods.length > 0) {
        const hasPaypal = config.methods.some((method) => method.id === 'paypal');
        const hasCard = config.methods.some((method) => method.id === 'card');
        const hasAffirm = config.methods.some((method) => method.id === 'affirm');
        const next = hasPaypal
          ? 'paypal'
          : hasCard
            ? 'card'
            : hasAffirm
              ? 'affirm'
              : (config.methods[0].id as ActivePaymentMethod);
        setSelectedPayment((prev) => prev || next);
      } else {
        setSelectedPayment((prev) => prev || '');
      }
      // Load PayPal SDK if configured
      if (config.paypal) {
        setPaypalSdkError(null);
        const existing = document.querySelector('script[data-paypal-sdk]');
        if (existing) {
          const existingClientId = existing.getAttribute('data-paypal-client-id');
          if (existingClientId && existingClientId !== config.paypal.clientId) {
            existing.remove();
          } else {
            const hasSdk = Boolean((window as unknown as Record<string, unknown>).paypal);
            if (hasSdk) {
              setPaypalSdkReady(true);
              return;
            }
            existing.addEventListener('load', () => {
              if (!cancelled) setPaypalSdkReady(true);
            }, { once: true });
            existing.addEventListener('error', () => {
              if (!cancelled) setPaypalSdkError('PayPal SDK failed to load. Check your client ID and network.');
            }, { once: true });
            return;
          }
        }
        setPaypalSdkReady(false);
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypal.clientId)}&currency=USD&intent=capture`;
        script.setAttribute('data-paypal-sdk', 'true');
        script.setAttribute('data-paypal-client-id', config.paypal.clientId);
        script.async = true;
        script.onload = () => { if (!cancelled) setPaypalSdkReady(true); };
        script.onerror = () => { if (!cancelled) setPaypalSdkError('PayPal SDK failed to load. Check your client ID and network.'); };
        document.head.appendChild(script);
      } else {
        setPaypalSdkReady(false);
      }
    }).catch((err) => {
      console.error('Failed to load payment config', err);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!paymentConfig?.affirm) {
      setAffirmSdkReady(false);
      return;
    }
    let cancelled = false;
    setAffirmSdkError(null);

    if (paymentConfig.affirm.mode === 'mock') {
      initMockAffirm();
      setAffirmSdkReady(true);
      return () => { cancelled = true; };
    }

    loadAffirm({
      publicKey: paymentConfig.affirm.publicKey,
      scriptUrl: paymentConfig.affirm.scriptUrl,
    }).then(() => {
      if (!cancelled) setAffirmSdkReady(true);
    }).catch((err) => {
      if (!cancelled) setAffirmSdkError(err instanceof Error ? err.message : 'Affirm SDK failed to load.');
    });
    return () => { cancelled = true; };
  }, [paymentConfig?.affirm?.publicKey, paymentConfig?.affirm?.scriptUrl, paymentConfig?.affirm?.mode]);

  // Fetch carrier rates when shipping address is selected
  useEffect(() => {
    const fetchRates = async () => {
      if (!selectedAddress || !user?.shippingAddresses) {
        return;
      }

      const addressData = user.shippingAddresses.find((a) => a.id === selectedAddress);
      if (!addressData || !addressData.postalCode) {
        return;
      }

      setLoadingRates(true);
      setRatesError(null);

      try {
        const response = await shippingApi.getRates({
          shipTo: {
            fullName: addressData.fullName ?? undefined,
            phone: addressData.phone ?? undefined,
            addressLine1: addressData.addressLine1 ?? undefined,
            addressLine2: addressData.addressLine2 ?? undefined,
            city: addressData.city ?? undefined,
            state: addressData.state ?? undefined,
            postalCode: addressData.postalCode ?? undefined,
            country: addressData.country ?? undefined,
          },
        });

        if (response.success && response.rates.length > 0) {
          setCarrierRates(response.rates);
          // Auto-select first rate
          setSelectedRateId(response.rates[0].rateId);
          setSelectedRatePrice(response.rates[0].price);
        } else {
          setCarrierRates([]);
          setRatesError(response.message || 'No rates available');
        }
      } catch (err) {
        console.error('Failed to fetch shipping rates:', err);
        setCarrierRates([]);
        setRatesError('Could not load carrier rates. Using default shipping options.');
      } finally {
        setLoadingRates(false);
      }
    };

    void fetchRates();
  }, [selectedAddress, user?.shippingAddresses]);

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
      const price = getEffectivePrice(productMap[line.productId]);
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
    // Use selected rate price from ShipEngine
    return selectedRatePrice;
  }, [selectedRatePrice]);

  const isB2BUser = user?.clientType === 'B2B';
  const isC2BUser = user?.clientType === 'C2B';
  const hasCompanyAddress = Boolean(user?.company?.address && user.company.address.trim());
  const hasBillingAddress = Boolean(
    user?.billingAddress?.addressLine1?.trim() &&
    user?.billingAddress?.city?.trim() &&
    user?.billingAddress?.state?.trim() &&
    user?.billingAddress?.country?.trim()
  );
  const hasVerificationFile = Boolean(user?.verificationFileUrl);
  const needsCompanyAddress = Boolean(isB2BUser && !hasCompanyAddress);
  const needsVerification = Boolean(isB2BUser && !hasVerificationFile);

  const tax = useMemo(() => {
    if ((!isB2BUser && !isC2BUser) || user?.taxExempt || taxRate <= 0) return 0;
    return Math.round(discountedSubtotal * (taxRate / 100) * 100) / 100;
  }, [discountedSubtotal, isB2BUser, isC2BUser, taxRate, user?.taxExempt]);

  const total = discountedSubtotal + shippingCost + tax;
  const paypalMethod = useMemo(
    () => paymentConfig?.methods.find((method) => method.id === 'paypal') ?? null,
    [paymentConfig]
  );
  const cardMethod = useMemo(
    () => paymentConfig?.methods.find((method) => method.id === 'card') ?? null,
    [paymentConfig]
  );
  const affirmMethod = useMemo(
    () => paymentConfig?.methods.find((method) => method.id === 'affirm') ?? null,
    [paymentConfig]
  );
  const affirmMinTotal = paymentConfig?.affirm?.minTotal ?? 1000;
  const affirmEligible = total >= affirmMinTotal;
  const stripePromise = useMemo(() => {
    const key = paymentConfig?.stripe?.publishableKey;
    return key ? loadStripe(key) : null;
  }, [paymentConfig?.stripe?.publishableKey]);
  const isCardFormComplete = Boolean(
    cardForm.holderName.trim() &&
    cardFieldState.numberComplete &&
    cardFieldState.expiryComplete &&
    cardFieldState.cvcComplete
  );
  const selectedPaymentLabel = useMemo(() => {
    if (selectedPayment === 'card') return cardMethod?.name || CARD_METHOD_LABEL;
    return paymentConfig?.methods.find((method) => method.id === selectedPayment)?.name ?? selectedPayment;
  }, [paymentConfig, selectedPayment, cardMethod]);

  useEffect(() => {
    if (selectedPayment === 'affirm' && !affirmEligible) {
      const fallback = paypalMethod ? 'paypal' : cardMethod ? 'card' : '';
      setSelectedPayment(fallback);
    }
  }, [affirmEligible, cardMethod, paypalMethod, selectedPayment]);

  useEffect(() => {
    if (selectedPayment !== 'affirm') {
      setCompletedAffirmTransactionId(null);
      setAffirmError(null);
    }
  }, [selectedPayment]);

  useEffect(() => {
    if (selectedPayment === 'affirm') {
      setCompletedAffirmTransactionId(null);
    }
  }, [total, selectedPayment]);

  const selectedAddressData = useMemo(() => {
    return user?.shippingAddresses?.find((addr) => addr.id === selectedAddress);
  }, [user, selectedAddress]);
  const billingAddressData = useMemo(() => user?.billingAddress ?? null, [user]);

  const handleStripeReady = useCallback(
    (stripeInstance: Stripe | null, elementsInstance: StripeElements | null) => {
      stripeRef.current = stripeInstance;
      elementsRef.current = elementsInstance;
    },
    []
  );

  const handleCardFieldChange = useCallback(
    (field: 'number' | 'expiry' | 'cvc', complete: boolean, error?: string | null) => {
      setCardFieldState((prev) => ({
        ...prev,
        numberComplete: field === 'number' ? complete : prev.numberComplete,
        expiryComplete: field === 'expiry' ? complete : prev.expiryComplete,
        cvcComplete: field === 'cvc' ? complete : prev.cvcComplete,
      }));
      setCardError(error || null);
    },
    []
  );

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

  const needsB2BRequirements = needsCompanyAddress || needsVerification;
  const hasShippingAddress = Boolean(user?.shippingAddresses && user.shippingAddresses.length > 0);
  const needsShippingAddress = !hasShippingAddress;
  const needsShippingAddressAfterB2B = !needsB2BRequirements && needsShippingAddress;
  const needsBillingAddress = Boolean(isC2BUser && !hasBillingAddress);
  const needsBillingAddressAfterB2B = !needsB2BRequirements && needsBillingAddress;
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
  const isBillingUnitedStates = ['united states', 'united states of america'].includes(
    (billingForm.country ?? '').trim().toLowerCase()
  );

  useEffect(() => {
    if ((needsB2BRequirements || needsShippingAddressAfterB2B || needsBillingAddressAfterB2B) && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [needsB2BRequirements, needsShippingAddressAfterB2B, needsBillingAddressAfterB2B, currentStep]);

  useEffect(() => {
    let active = true;
    const canLookupTax =
      user &&
      !user.taxExempt &&
      ((isB2BUser && Boolean(user.company?.address?.trim())) || (isC2BUser && hasBillingAddress));

    if (!canLookupTax) {
      setTaxRate(0);
      return () => {
        active = false;
      };
    }

    const loadTaxRate = async () => {
      try {
        const params =
          isC2BUser && user?.billingAddress
            ? {
              country: user.billingAddress.country ?? undefined,
              state: user.billingAddress.state ?? undefined,
            }
            : undefined;
        const { taxRate: matched } = await taxRatesApi.lookup(params);
        if (!active) return;
        setTaxRate(matched?.rate ?? 0);
      } catch (err) {
        if (!active) return;
        setTaxRate(0);
      }
    };

    void loadTaxRate();
    return () => {
      active = false;
    };
  }, [hasBillingAddress, isB2BUser, isC2BUser, user?.billingAddress, user?.company?.address, user?.taxExempt, user]);

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

    if (needsBillingAddressAfterB2B) {
      return {
        valid: false,
        error: 'Please add a billing address before checkout.'
      };
    }

    return { valid: true };
  };

  const canProceedWithPayment = () => {
    if (!items.length) {
      setError('Your cart is empty.');
      return false;
    }
    if (needsShippingAddressAfterB2B) {
      setError('Please add a shipping address before checkout.');
      openShippingModal();
      return false;
    }
    if (needsBillingAddressAfterB2B) {
      setError('Please add a billing address before checkout.');
      openBillingModal();
      return false;
    }
    if (!selectedAddress) {
      setError('Please select a shipping address.');
      return false;
    }

    const validation = validateCartForCheckout();
    if (!validation.valid) {
      setError(validation.error || 'Unable to place order');
      return false;
    }

    return true;
  };

  const buildOrderPayload = () => {
    const couponPayload = appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {};
    const selectedRate = selectedRateId
      ? carrierRates.find((rate) => rate.rateId === selectedRateId)
      : null;
    const shippingRatePayload = selectedRate
      ? {
        rateId: selectedRate.rateId,
        carrierId: selectedRate.carrierId,
        carrierCode: selectedRate.carrierCode,
        carrierName: selectedRate.carrierName,
        serviceCode: selectedRate.serviceCode,
        serviceName: selectedRate.serviceName,
        price: selectedRate.price,
        currency: selectedRate.currency,
        deliveryDays: selectedRate.deliveryDays,
        estimatedDelivery: selectedRate.estimatedDelivery,
      }
      : undefined;

    const payload = {
      products: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      shippingMethod: selectedShipping,
      shippingAddressId: selectedAddress,
      ...(shippingRatePayload ? { shippingRate: shippingRatePayload } : {}),
      ...couponPayload,
    };

    return { payload, shippingRatePayload };
  };

  const startAffirmCheckout = async () => {
    if (!canProceedWithPayment()) return;
    if (!affirmEligible) {
      setError(`Affirm is available for orders of $${affirmMinTotal} or more.`);
      return;
    }
    if (!paymentConfig?.affirm) {
      setError('Affirm payments are not configured. Please choose another method.');
      return;
    }
    if (!affirmSdkReady) {
      setAffirmError(affirmSdkError ?? 'Affirm is still loading. Please try again.');
      return;
    }

    setAffirmProcessing(true);
    setAffirmError(null);
    setError(null);

    try {
      const { payload } = buildOrderPayload();
      const response = await paymentsApi.createAffirmCheckout(payload);
      type AffirmCheckout = ((data: Record<string, unknown>) => void) & {
        open: (opts: {
          onSuccess?: (result: { checkout_id?: string }) => void;
          onFail?: () => void;
          onValidationError?: (err: { message?: string }) => void;
        }) => void;
      };
      const affirm = (window as unknown as Record<string, unknown>).affirm as
        | { checkout: AffirmCheckout }
        | undefined;

      if (!affirm || typeof affirm.checkout !== 'function' || typeof affirm.checkout.open !== 'function') {
        throw new Error('Affirm is not ready. Please try again.');
      }

      affirm.checkout(response.checkout as Record<string, unknown>);
      affirm.checkout.open({
        onSuccess: async (result) => {
          const checkoutToken = result?.checkout_id;
          if (!checkoutToken) {
            setAffirmError('Affirm did not return a checkout token.');
            setAffirmProcessing(false);
            return;
          }
          try {
            const auth = await paymentsApi.authorizeAffirmTransaction({
              ...payload,
              checkoutToken,
              orderId: response.orderId,
            });
            setCompletedAffirmTransactionId(auth.transactionId);
            await placeOrder({ affirmTransactionId: auth.transactionId });
          } catch (err) {
            setAffirmError(err instanceof Error ? err.message : 'Unable to authorize Affirm payment.');
          } finally {
            setAffirmProcessing(false);
          }
        },
        onFail: () => {
          setAffirmError('Affirm checkout was canceled.');
          setAffirmProcessing(false);
        },
        onValidationError: (err) => {
          setAffirmError(err?.message ?? 'Affirm checkout validation failed.');
          setAffirmProcessing(false);
        },
      });
    } catch (err) {
      setAffirmError(err instanceof Error ? err.message : 'Unable to start Affirm checkout.');
      setAffirmProcessing(false);
    }
  };

  const placeOrder = async (options?: { paypalOrderId?: string; affirmTransactionId?: string }) => {
    if (!canProceedWithPayment()) return;

    if (selectedPayment === 'card' && !isCardFormComplete) {
      setError('Please enter complete card details.');
      return;
    }
    if (selectedPayment === 'card' && !stripePromise) {
      setError('Card payments are not configured. Please choose another method.');
      return;
    }

    setPlacingOrder(true);
    setError(null);
    try {
      const { payload } = buildOrderPayload();

      // ── Process payment based on selected method ──────────────
      let paymentMethod: 'paypal' | 'stripe' | 'affirm' | 'none' = 'none';
      let paymentId: string | undefined;

      if (selectedPayment === 'paypal') {
        // PayPal flow already completed via PayPalCheckoutButton
        const orderId = options?.paypalOrderId ?? completedPaypalOrderId;
        if (!orderId) throw new Error('Please complete PayPal payment first');
        paymentMethod = 'paypal';
        paymentId = orderId;
      } else if (selectedPayment === 'affirm') {
        const affirmId = options?.affirmTransactionId ?? completedAffirmTransactionId;
        if (!affirmId) throw new Error('Please complete Affirm checkout first');
        paymentMethod = 'affirm';
        paymentId = affirmId;
      } else if (selectedPayment === 'card') {
        const stripe = stripeRef.current;
        const elements = elementsRef.current;

        if (!stripe || !elements) {
          throw new Error('Card payment is not ready. Please try again.');
        }

        const cardElement = elements.getElement(CardNumberElement);
        if (!cardElement) {
          throw new Error('Card details are incomplete.');
        }

        const intentResponse = await paymentsApi.createStripePaymentIntent(payload);

        const result = await stripe.confirmCardPayment(intentResponse.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: cardForm.holderName.trim() },
          },
        });

        if (result.error) {
          throw new Error(result.error.message || 'Card payment failed');
        }

        const paymentIntent = result.paymentIntent;
        if (!paymentIntent) {
          throw new Error('Payment confirmation failed');
        }

        if (!['succeeded', 'processing'].includes(paymentIntent.status)) {
          throw new Error(`Payment status: ${paymentIntent.status}`);
        }

        paymentMethod = 'stripe';
        paymentId = paymentIntent.id;
      }

      await ordersApi.create({
        ...payload,
        paymentMethod,
        paymentId,
      });
      await clearCart();
      clearStoredCouponCode();
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setEligibleSubtotal(0);
      setCouponError(null);
      setCouponCode('');
      setCompletedPaypalOrderId(null);
      setCompletedAffirmTransactionId(null);
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
    if (needsB2BRequirements || needsShippingAddressAfterB2B || needsBillingAddressAfterB2B) return false;
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

  const resetBillingForm = () => {
    setBillingForm({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    });
    setBillingError(null);
  };

  const openShippingModal = () => {
    resetShippingForm();
    setShowShippingModal(true);
  };

  const openBillingModal = () => {
    const seed = user?.billingAddress ?? selectedAddressData;
    setBillingForm({
      addressLine1: seed?.addressLine1 ?? '',
      addressLine2: seed?.addressLine2 ?? '',
      city: seed?.city ?? '',
      state: seed?.state ?? '',
      postalCode: seed?.postalCode ?? '',
      country: seed?.country ?? 'United States',
    });
    setBillingError(null);
    setShowBillingModal(true);
  };

  const closeShippingModal = () => {
    if (shippingSaving) {
      return;
    }
    setShowShippingModal(false);
    setShippingError(null);
  };

  const closeBillingModal = () => {
    if (billingSaving) {
      return;
    }
    setShowBillingModal(false);
    setBillingError(null);
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

  const handleUseShippingAsBilling = () => {
    if (!selectedAddressData) {
      return;
    }
    setBillingForm({
      addressLine1: selectedAddressData.addressLine1 ?? '',
      addressLine2: selectedAddressData.addressLine2 ?? '',
      city: selectedAddressData.city ?? '',
      state: selectedAddressData.state ?? '',
      postalCode: selectedAddressData.postalCode ?? '',
      country: selectedAddressData.country ?? 'United States',
    });
    setBillingError(null);
  };

  const handleSaveBillingAddress = async () => {
    if (!user) {
      return;
    }

    const trimmedAddress = (billingForm.addressLine1 ?? '').trim();
    const trimmedCity = (billingForm.city ?? '').trim();
    const trimmedState = (billingForm.state ?? '').trim();
    const trimmedCountry = (billingForm.country ?? '').trim();

    if (!trimmedAddress || !trimmedCity || !trimmedState || !trimmedCountry) {
      setBillingError('Billing address, country, state, and city are required.');
      return;
    }

    setBillingSaving(true);
    setBillingError(null);

    try {
      const payload: BillingAddressPayload = {
        addressLine1: trimmedAddress,
        addressLine2: billingForm.addressLine2?.trim() || undefined,
        city: trimmedCity,
        state: trimmedState,
        postalCode: billingForm.postalCode?.trim() || undefined,
        country: trimmedCountry,
      };

      await usersApi.updateBillingAddress(user.id, payload);
      await refresh();

      setShowBillingModal(false);
      resetBillingForm();
      setStatusMessage('Billing address saved. You can continue checkout.');
      setError(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setBillingError(err instanceof Error ? err.message : 'Failed to save billing address.');
    } finally {
      setBillingSaving(false);
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
  const needsBillingAddressCompletion = normalizedError.includes('billing address');
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
  const billingFormComplete =
    (billingForm.addressLine1 ?? '').trim() &&
    (billingForm.city ?? '').trim() &&
    (billingForm.state ?? '').trim() &&
    (billingForm.country ?? '').trim();
  const canSaveBillingAddress = Boolean(billingFormComplete);

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
                      className={`text-sm font-medium ${step.completed
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
                  {needsBillingAddressCompletion && needsBillingAddressAfterB2B && (
                    <button
                      type="button"
                      onClick={openBillingModal}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                    >
                      Add billing address
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
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentStep > 1 ? 'bg-green-100 text-green-600' : 'bg-red-600 text-white'
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
                    ) : (
                      <>
                        {user.shippingAddresses && user.shippingAddresses.length > 0 ? (
                          <div className="space-y-3">
                            {user.shippingAddresses.map((address, index) => (
                              <label
                                key={address.id || index}
                                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${selectedAddress === (address.id || String(index))
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

                        {isC2BUser && (
                          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Billing address</p>
                                <p className="text-xs text-slate-600">
                                  We use this address to calculate taxes for your order.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={openBillingModal}
                                className="text-sm font-semibold text-red-600 hover:text-red-700"
                              >
                                {hasBillingAddress ? 'Edit' : 'Add'}
                              </button>
                            </div>

                            {hasBillingAddress && billingAddressData ? (
                              <div className="mt-3 text-sm text-slate-700">
                                <p>
                                  {billingAddressData.addressLine1}
                                  {billingAddressData.addressLine2 && `, ${billingAddressData.addressLine2}`}
                                </p>
                                <p>
                                  {billingAddressData.city}, {billingAddressData.state} {billingAddressData.postalCode}
                                </p>
                                <p>{billingAddressData.country}</p>
                              </div>
                            ) : (
                              <div className="mt-3">
                                <p className="text-xs text-amber-800">
                                  Add a billing address to continue checkout.
                                </p>
                                <button
                                  type="button"
                                  onClick={openBillingModal}
                                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-red-700"
                                >
                                  Add billing address
                                </button>
                              </div>
                            )}
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
                    {isC2BUser && billingAddressData && (
                      <p className="mt-2 text-xs text-slate-500">
                        Billing: {billingAddressData.addressLine1}, {billingAddressData.city}, {billingAddressData.state} {billingAddressData.postalCode}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Shipping Method */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    !needsB2BRequirements &&
                    !needsShippingAddressAfterB2B &&
                    !needsBillingAddressAfterB2B &&
                    currentStep > 1 &&
                    setCurrentStep(2)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentStep > 2 ? 'bg-green-100 text-green-600' : currentStep === 2 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'
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
                    {loadingRates ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        <span className="ml-3 text-sm text-slate-600">Loading carrier rates...</span>
                      </div>
                    ) : carrierRates.length > 0 ? (
                      <div
                        className="space-y-3 overflow-y-auto pr-2"
                        style={{ maxHeight: SHIPPING_RATE_LIST_MAX_HEIGHT }}
                      >
                        {carrierRates.map((rate) => (
                          <label
                            key={rate.rateId}
                            style={{ minHeight: SHIPPING_RATE_ROW_MIN_HEIGHT }}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${selectedRateId === rate.rateId
                              ? 'border-red-600 bg-red-50'
                              : 'border-slate-200 hover:border-red-300'
                              }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <input
                                type="radio"
                                name="shipping"
                                checked={selectedRateId === rate.rateId}
                                onChange={() => {
                                  setSelectedRateId(rate.rateId);
                                  setSelectedRatePrice(rate.price);
                                }}
                                className="h-4 w-4 text-red-600 focus:ring-red-500"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">{rate.carrierName} - {rate.serviceName}</p>
                                <p className="text-sm text-slate-600 truncate">
                                  {rate.deliveryDays ? `${rate.deliveryDays} day${rate.deliveryDays > 1 ? 's' : ''} delivery` : 'Standard delivery'}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-slate-900">
                              {rate.price === 0 ? 'FREE' : formatCurrency(rate.price)}
                            </p>
                          </label>
                        ))}
                        {ratesError && (
                          <p className="text-xs text-amber-600 mt-2">{ratesError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
                        <Truck className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                        <p className="font-semibold text-amber-900 mb-1">
                          Unable to load shipping rates
                        </p>
                        <p className="text-sm text-amber-700 mb-4">
                          {ratesError || 'Please check that your shipping address is complete and try again.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            // Trigger re-fetch by toggling address selection
                            const currentAddr = selectedAddress;
                            setSelectedAddress('');
                            setTimeout(() => setSelectedAddress(currentAddr), 100);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry
                        </button>
                      </div>
                    )}

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
                    <p>
                      {selectedRateId && carrierRates.length > 0
                        ? carrierRates.find(r => r.rateId === selectedRateId)?.carrierName + ' - ' + carrierRates.find(r => r.rateId === selectedRateId)?.serviceName
                        : 'No shipping method selected'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Payment Method */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    !needsB2BRequirements &&
                    !needsShippingAddressAfterB2B &&
                    !needsBillingAddressAfterB2B &&
                    currentStep > 2 &&
                    setCurrentStep(3)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentStep > 3 ? 'bg-green-100 text-green-600' : currentStep === 3 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'
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

                <div className={`p-6 border-t border-slate-200 ${currentStep === 3 ? 'block' : 'hidden'}`}>
                  {paymentConfig && paymentConfig.methods.length > 0 ? (
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {paypalMethod && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment('paypal');
                              setCompletedPaypalOrderId(null);
                              setCardError(null);
                            }}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedPayment === 'paypal'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                          >
                            {paypalMethod.name || 'PayPal'}
                          </button>
                        )}
                        {cardMethod && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment('card');
                              setCompletedPaypalOrderId(null);
                              setCompletedAffirmTransactionId(null);
                              setCardError(null);
                            }}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedPayment === 'card'
                              ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                          >
                            {cardMethod.name || CARD_METHOD_LABEL}
                          </button>
                        )}
                        {affirmMethod && affirmEligible && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment('affirm');
                              setCompletedPaypalOrderId(null);
                              setCompletedAffirmTransactionId(null);
                              setCardError(null);
                            }}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedPayment === 'affirm'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                          >
                            {affirmMethod.name || 'Affirm'}
                          </button>
                        )}
                      </div>
                      {affirmMethod && !affirmEligible && (
                        <p className="text-xs text-slate-500">
                          Affirm is available for orders of {formatCurrency(affirmMinTotal)} or more.
                        </p>
                      )}
                      {!paypalMethod && !cardMethod && !affirmMethod && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                          <p className="text-sm text-amber-800">No payment methods are currently configured. Please contact the store administrator.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm text-amber-800">No payment methods are currently configured. Please contact the store administrator.</p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      disabled={!selectedPayment}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Review Order
                    </button>
                  </div>
                </div>

                {currentStep > 3 && (
                  <div className="px-6 pb-4 text-sm text-slate-600">
                    <p>{selectedPaymentLabel}</p>
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
                      const unitPrice = getEffectivePrice(product);
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
                              {formatCurrency(unitPrice * line.quantity)}
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
                      const isBillingAddressMissing =
                        needsBillingAddressAfterB2B && lowerMessage.includes('billing address');

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
                              {isBillingAddressMissing && (
                                <button
                                  type="button"
                                  onClick={openBillingModal}
                                  className="relative inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                >
                                  <span aria-hidden="true" className="fill-now-wave" />
                                  <span aria-hidden="true" className="fill-now-wave fill-now-wave-delay" />
                                  <span className="relative z-10">Add billing address</span>
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

                  {/* ── Payment form (rendered in review step) ──── */}
                  {selectedPayment === 'paypal' && completedPaypalOrderId && (
                    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">PayPal payment confirmed. Finalizing your order...</p>
                    </div>
                  )}

                  {selectedPayment === 'affirm' && completedAffirmTransactionId && (
                    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <p className="text-sm text-emerald-800">Affirm payment authorized. Finalizing your order...</p>
                    </div>
                  )}

                  {selectedPayment === 'affirm' && affirmError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {affirmError}
                    </div>
                  )}

                  {selectedPayment === 'card' && (
                    <div className="mt-6">
                      {stripePromise ? (
                        <Elements stripe={stripePromise}>
                          <StripeCardFields
                            holderName={cardForm.holderName}
                            onHolderNameChange={(value) =>
                              setCardForm((prev) => ({ ...prev, holderName: value }))
                            }
                            onStripeReady={handleStripeReady}
                            onFieldChange={handleCardFieldChange}
                            disabled={placingOrder}
                            errorMessage={cardError}
                          />
                        </Elements>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          Card payments are not configured. Please choose another method.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 border-2 border-slate-300 text-slate-700 px-6 rounded-lg font-semibold hover:bg-slate-50 transition h-[45px] flex items-center justify-center"
                    >
                      Back
                    </button>

                    {selectedPayment === 'paypal' ? (
                      completedPaypalOrderId ? (
                        <button
                          onClick={() => placeOrder({ paypalOrderId: completedPaypalOrderId })}
                          disabled={placingOrder}
                          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {placingOrder ? 'Finalizing...' : 'Retry Place Order'}
                        </button>
                      ) : paypalSdkReady ? (
                        <div className="flex-1">
                          <PayPalCheckoutButton
                            amount={total}
                            disabled={placingOrder}
                            onSuccess={(orderId) => {
                              setCompletedPaypalOrderId(orderId);
                              void placeOrder({ paypalOrderId: orderId });
                            }}
                            onError={(msg) => setError(msg)}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {paypalSdkError ?? 'Loading PayPal...'}
                        </div>
                      )
                    ) : selectedPayment === 'affirm' ? (
                      completedAffirmTransactionId ? (
                        <button
                          onClick={() => placeOrder({ affirmTransactionId: completedAffirmTransactionId })}
                          disabled={placingOrder}
                          className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {placingOrder ? 'Finalizing...' : 'Retry Place Order'}
                        </button>
                      ) : affirmSdkReady ? (
                        <button
                          onClick={() => void startAffirmCheckout()}
                          disabled={placingOrder || affirmProcessing}
                          className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {affirmProcessing ? 'Starting Affirm...' : 'Continue with Affirm'}
                        </button>
                      ) : (
                        <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {affirmSdkError ?? 'Loading Affirm...'}
                        </div>
                      )
                    ) : (
                      <button
                        onClick={() => void placeOrder()}
                        disabled={
                          placingOrder ||
                          (selectedPayment === 'card' && (!isCardFormComplete || !stripePromise))
                        }
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {placingOrder ? 'Processing...' : 'Place Order'}
                      </button>
                    )}
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
                  <span className="text-slate-600">
                    Tax{taxRate > 0 ? ` (${taxRate}%)` : ''}:
                  </span>
                  <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between">
                  <span className="font-semibold text-slate-900">Total:</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-4 p-3 bg-slate-50 rounded-lg">
                <p>Secure checkout</p>
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
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${requirementsSaving
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

      {/* Add Billing Address Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add billing address</h3>
              <button
                type="button"
                onClick={closeBillingModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Add your billing details so we can calculate tax correctly.
              </p>

              {billingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{billingError}</p>
                </div>
              )}

              {selectedAddressData && (
                <button
                  type="button"
                  onClick={handleUseShippingAsBilling}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
                >
                  Use selected shipping address
                </button>
              )}

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Address line 1
                <input
                  type="text"
                  value={billingForm.addressLine1 ?? ''}
                  onChange={(event) =>
                    setBillingForm((prev) => ({ ...prev, addressLine1: event.target.value }))
                  }
                  placeholder="Street address, P.O. box"
                  disabled={billingSaving}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Address line 2
                <input
                  type="text"
                  value={billingForm.addressLine2 ?? ''}
                  onChange={(event) =>
                    setBillingForm((prev) => ({ ...prev, addressLine2: event.target.value }))
                  }
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  disabled={billingSaving}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <span>Country</span>
                <CountrySelect
                  value={billingForm.country || 'United States'}
                  onChange={(value) => setBillingForm((prev) => ({ ...prev, country: value }))}
                  placement="auto"
                  className="w-full"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  State / Province
                  {isBillingUnitedStates ? (
                    <CountrySelect
                      value={billingForm.state || ''}
                      onChange={(value) => setBillingForm((prev) => ({ ...prev, state: value }))}
                      options={US_STATES}
                      placeholder="Select state"
                      searchPlaceholder="Search states..."
                      placement="auto"
                      className="w-full"
                    />
                  ) : (
                    <input
                      type="text"
                      value={billingForm.state ?? ''}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, state: event.target.value }))
                      }
                      placeholder="State / Province"
                      disabled={billingSaving}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  City
                  <input
                    type="text"
                    value={billingForm.city ?? ''}
                    onChange={(event) => setBillingForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    disabled={billingSaving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Postal code
                  <input
                    type="text"
                    value={billingForm.postalCode ?? ''}
                    onChange={(event) =>
                      setBillingForm((prev) => ({ ...prev, postalCode: event.target.value }))
                    }
                    placeholder="Postal code"
                    disabled={billingSaving}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeBillingModal}
                disabled={billingSaving}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBillingAddress}
                disabled={billingSaving || !canSaveBillingAddress}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {billingSaving ? 'Saving...' : 'Save & Continue'}
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
