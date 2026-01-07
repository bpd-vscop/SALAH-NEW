import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, Shield, Headphones, CreditCard, AlertCircle } from 'lucide-react';
import { couponsApi } from '../api/coupons';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Coupon, Product } from '../types/api';
import { clearStoredCouponCode, readStoredCouponCode, writeStoredCouponCode } from '../utils/couponStorage';
import { formatCurrency } from '../utils/format';
import { getEffectivePrice } from '../utils/productStatus';

export const CartPage: React.FC = () => {
  const { items, updateItem, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [eligibleSubtotal, setEligibleSubtotal] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const lastValidatedSignatureRef = useRef('');
  const storedCouponLoadedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const missing = items
      .filter((line) => !productMap[line.productId])
      .map((line) => line.productId);
    if (!missing.length) {
      return;
    }

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
        const nextMap: Record<string, Product> = {};
        responses.forEach((result) => {
          if (result.status === 'fulfilled') {
            const product = result.value.product;
            nextMap[product.id] = product;
          }
        });
        setProductMap((current) => ({ ...current, ...nextMap }));
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [items, productMap]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap[line.productId];
      const price = getEffectivePrice(product);
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

  const steps = [
    { label: 'Cart', active: true },
    { label: 'Address', active: false },
    { label: 'Shipping', active: false },
    { label: 'Payment', active: false },
    { label: 'Confirm', active: false },
    { label: 'Complete', active: false },
  ];

  const handleCheckout = () => {
    if (!user) {
      // Redirect to login
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    // Proceed to checkout
    navigate('/checkout');
  };

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
                        step.active ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-4 text-slate-400">›</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!items.length && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Your cart is empty</h2>
              <p className="text-slate-600 mb-6">
                Start exploring our catalog to add items to your cart.
              </p>
              <Link
                to="/products"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Continue Shopping
              </Link>
            </div>
          )}

          {loadingProducts && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-slate-600">Loading product details...</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Cart Items Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Image</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Product(s)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Qty.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((line) => {
                        const product = productMap[line.productId];
                        const unitPrice = getEffectivePrice(product);
                        const itemTotal = unitPrice * line.quantity;
                        return (
                          <tr key={line.productId} className="border-b border-slate-200">
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {product?.sku || 'N/A'}
                            </td>
                            <td className="px-4 py-4">
                              <img
                                src={product?.images?.[0] ?? 'https://placehold.co/80x80?text=Item'}
                                alt={product?.name ?? 'Cart item'}
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-md">
                                <h3 className="text-sm font-medium text-slate-900">
                                  {product?.name ?? 'Loading...'}
                                </h3>
                                {product?.description && (
                                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (line.quantity > 1) {
                                      updateItem(line.productId, line.quantity - 1);
                                    }
                                  }}
                                  className="h-8 w-8 rounded border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center justify-center"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={line.quantity}
                                  onChange={(event) => {
                                    const nextQuantity = Number(event.target.value);
                                    if (!Number.isNaN(nextQuantity) && nextQuantity > 0) {
                                      updateItem(line.productId, nextQuantity);
                                    }
                                  }}
                                  className="h-8 w-16 rounded border border-slate-300 bg-white px-2 text-center text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                                <button
                                  onClick={() => updateItem(line.productId, line.quantity + 1)}
                                  className="h-8 w-8 rounded border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatCurrency(itemTotal)}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => removeItem(line.productId)}
                                className="text-slate-400 hover:text-red-600 transition"
                                title="Remove item"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
                  <Link
                    to="/products"
                    className="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Continue shopping
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to empty your cart?')) {
                        clearCart();
                      }
                    }}
                    className="px-6 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition"
                  >
                    Empty Cart
                  </button>
                </div>
              </div>

              {/* Sidebar - Coupon & Summary */}
              <div className="space-y-6">
                {/* Coupon Section */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Coupon</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter your coupon here"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => void validateCoupon(couponCode)}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-6 h-10 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply coupon'}
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

                {/* Order Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Sub-Total:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Discount ({appliedCoupon.code}):</span>
                        <span className="font-semibold text-emerald-600">
                          -{formatCurrency(couponDiscount)}
                        </span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Subtotal after discount:</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(Math.max(0, subtotal - couponDiscount))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Shipping:</span>
                      <span className="text-xs text-slate-500">Calculated during checkout</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Tax:</span>
                      <span className="font-semibold text-slate-900">$0.00</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-base font-semibold text-slate-900">Total:</span>
                      <span className="text-lg font-bold text-slate-900">
                        Calculated during checkout
                      </span>
                    </div>
                  </div>

                  {/* Not Logged In Warning */}
                  {!user && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900 mb-2">
                            Login Required
                          </p>
                          <p className="text-xs text-blue-700 mb-3">
                            You need to login or create an account to proceed with checkout.
                          </p>
                          <Link
                            to="/login"
                            state={{ from: '/cart' }}
                            className="inline-block text-xs font-semibold text-blue-900 hover:text-blue-950 underline"
                          >
                            Login / Register →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms Checkbox */}
                  <div className="mt-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-1 focus:ring-red-500"
                      />
                      <span className="text-xs text-slate-600">
                        I agree with the{' '}
                        <Link to="/terms" className="text-red-600 hover:underline">
                          terms of service
                        </Link>{' '}
                        and I adhere to them unconditionally
                      </span>
                    </label>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    disabled={!agreedToTerms}
                    onClick={handleCheckout}
                    className="mt-6 w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!user ? 'Login to Checkout' : 'Proceed to Checkout'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          {items.length > 0 && (
            <div className="mt-8 bg-slate-900 rounded-lg shadow-sm p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Free Shipping</h4>
                    <p className="text-xs text-slate-400">Free Express Shipping</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Money Guarantee</h4>
                    <p className="text-xs text-slate-400">Within our Refund Policy</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Headphones className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Online Support</h4>
                    <p className="text-xs text-slate-400">After-Sales technical support service</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Flexible Payment</h4>
                    <p className="text-xs text-slate-400">Multiple Secured Payment Methods</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
};
