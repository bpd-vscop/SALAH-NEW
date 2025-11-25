import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Package, CheckCircle, AlertCircle, Truck, Upload, X } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { productsApi } from '../api/products';
import { usersApi } from '../api/users';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
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

export const CheckoutPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const { items, clearCart } = useCart();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('standard');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('credit-card');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Address, 2: Shipping, 3: Payment, 4: Review
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Auto-select first address if available
  useEffect(() => {
    if (user?.shippingAddresses && user.shippingAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(user.shippingAddresses[0].id || '0');
    }
  }, [user, selectedAddress]);

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

  const shippingCost = useMemo(() => {
    const method = shippingMethods.find(m => m.id === selectedShipping);
    return method?.price ?? 0;
  }, [selectedShipping]);

  const tax = useMemo(() => {
    return subtotal * 0.1; // 10% tax
  }, [subtotal]);

  const total = subtotal + shippingCost + tax;

  const selectedAddressData = useMemo(() => {
    return user?.shippingAddresses?.find((addr) => addr.id === selectedAddress);
  }, [user, selectedAddress]);

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
    // Check if any product in cart requires B2B
    const requiresB2BProducts = items
      .map(item => productMap[item.productId])
      .filter(product => product?.requiresB2B === true);

    if (requiresB2BProducts.length === 0) {
      // No B2B products in cart, anyone can purchase
      return { valid: true };
    }

    // Cart has B2B-required products
    const isB2BUser = user?.clientType === 'B2B';
    const hasVerificationFile = user?.verificationFileUrl;

    if (!isB2BUser) {
      // C2B user trying to buy B2B products
      return {
        valid: false,
        error: 'Some products in your cart require a B2B account. Please switch your account to B2B type in your dashboard settings to purchase these products.'
      };
    }

    if (isB2BUser && !hasVerificationFile) {
      // B2B user without verification
      return {
        valid: false,
        error: 'Verification file is required before placing an order'
      };
    }

    // B2B user with verification
    return { valid: true };
  };

  const placeOrder = async () => {
    if (!items.length) {
      setError('Your cart is empty.');
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
      await ordersApi.create({
        products: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      await clearCart();
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
    if (currentStep === 1) return !!selectedAddress;
    if (currentStep === 2) return !!selectedShipping;
    if (currentStep === 3) return !!selectedPayment;
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a PDF, JPG, or PNG file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('verificationFile', file);

      await usersApi.update(user.id, formData);

      // Refresh user data to get updated verification status
      await refresh();

      setShowUploadModal(false);
      setStatusMessage('Verification file uploaded successfully!');
      setError(null); // Clear any previous errors

      // Clear the success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload verification file');
    } finally {
      setUploadingFile(false);
    }
  };

  const normalizedError = error?.toLowerCase() ?? '';
  const needsVerificationUpload = normalizedError.includes('verification file');
  const needsB2BSwitch =
    normalizedError.includes('switch your account to b2b') || normalizedError.includes('b2b account');

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

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  {/* Show upload link for B2B users without verification */}
                  {needsVerificationUpload && user?.clientType === 'B2B' && (
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
                    >
                      Upload verification file now
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
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 mb-4">No shipping addresses found.</p>
                        <button
                          onClick={() => navigate('/dashboard?tab=account')}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Add Address in Dashboard
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
                  onClick={() => currentStep > 1 && setCurrentStep(2)}
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
                  onClick={() => currentStep > 2 && setCurrentStep(3)}
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
                      const isB2BUserNeedsVerification =
                        user?.clientType === 'B2B' && lowerMessage.includes('verification file');

                      return (
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-900 mb-2">Action Required</p>
                              <p className="text-sm text-amber-800 mb-3">{validation.error}</p>
                              {isB2BUserNeedsVerification && (
                                <button
                                  type="button"
                                  onClick={() => setShowUploadModal(true)}
                                  className="text-sm font-semibold text-amber-900 hover:text-amber-950 underline"
                                >
                                  Upload verification file now
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

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
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

      {/* Upload Verification File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Upload Verification File</h3>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Please upload a verification document (business license, tax ID, or company registration) to complete your account setup.
              </p>

              {/* Upload Error */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              )}

              {/* File Upload Area */}
              <div className="relative">
                <input
                  type="file"
                  id="verification-file-upload"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  uploadingFile
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-slate-300 hover:border-red-400 hover:bg-red-50'
                }`}>
                  <Upload className={`h-12 w-12 mx-auto mb-3 ${uploadingFile ? 'text-slate-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {uploadingFile ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF, JPG, or PNG (max 5MB)
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Your document will be reviewed by our team. You'll be notified once it's approved.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                disabled={uploadingFile}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <label
                htmlFor="verification-file-upload"
                className={`flex-1 px-4 py-2.5 text-center rounded-lg font-semibold transition ${
                  uploadingFile
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                }`}
              >
                {uploadingFile ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
};
