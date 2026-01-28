const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { badRequest } = require('./appError');
const { extractCompanyLocation, findMatchingTaxRate } = require('./taxRates');

const COMING_SOON_TAG = 'coming soon';
const NEW_ARRIVAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeInventoryStatus = (inventory) => {
  if (!inventory || typeof inventory !== 'object') {
    return;
  }

  const quantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;
  const lowStockThreshold = typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : 0;
  const allowBackorder = Boolean(inventory.allowBackorder);

  if (inventory.status === 'out_of_stock') {
    inventory.allowBackorder = false;
    return;
  }

  if (inventory.status === 'preorder') {
    inventory.allowBackorder = true;
    return;
  }

  if (inventory.status === 'backorder') {
    inventory.allowBackorder = true;
    if (quantity <= 0) {
      return;
    }
  }

  if (allowBackorder && quantity <= 0) {
    inventory.status = 'backorder';
    return;
  }

  if (quantity <= 0) {
    inventory.status = 'out_of_stock';
  } else if (quantity <= lowStockThreshold) {
    inventory.status = 'low_stock';
  } else {
    inventory.status = 'in_stock';
  }
};

const isInventoryOutOfStock = (inventory) => {
  const status = inventory?.status ?? 'in_stock';
  const allowBackorder = inventory?.allowBackorder ?? false;
  const quantity = typeof inventory?.quantity === 'number' ? inventory.quantity : 0;
  return status === 'out_of_stock' || (!allowBackorder && quantity <= 0);
};

const sanitizeProductTags = (product) => {
  if (!product) return;
  const currentTags = Array.isArray(product.tags) ? product.tags : [];
  const sanitized = currentTags.filter((tag) => tag === COMING_SOON_TAG);
  if (!Array.isArray(product.tags) || sanitized.length !== currentTags.length) {
    product.tags = sanitized;
    product.markModified('tags');
  }
};

const isProductOnSale = (product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }
  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

const getProductUnitPrice = (product) => {
  if (isProductOnSale(product) && typeof product.salePrice === 'number') {
    return product.salePrice;
  }
  return typeof product.price === 'number' ? product.price : 0;
};

const computeCouponDiscount = (coupon, items, productMap) => {
  const appliesToAll = !coupon.categoryIds.length && !coupon.productIds.length;
  const couponProductIds = new Set(coupon.productIds.map((id) => id.toString()));
  const couponCategoryIds = new Set(coupon.categoryIds.map((id) => id.toString()));

  let eligibleSubtotal = 0;

  items.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return;
    }

    const quantity = item.quantity;
    const unitPrice = getProductUnitPrice(product);
    const lineTotal = unitPrice * quantity;

    let isEligible = appliesToAll || couponProductIds.has(product._id.toString());

    if (!isEligible && couponCategoryIds.size > 0) {
      const productCategoryIds = new Set(
        [
          product.categoryId ? product.categoryId.toString() : null,
          ...(Array.isArray(product.categoryIds) ? product.categoryIds.map((id) => id.toString()) : []),
        ].filter(Boolean)
      );
      isEligible = Array.from(productCategoryIds).some((categoryId) => couponCategoryIds.has(categoryId));
    }

    if (isEligible) {
      eligibleSubtotal += lineTotal;
    }
  });

  if (eligibleSubtotal <= 0) {
    throw badRequest('Coupon does not apply to any items in your cart');
  }

  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (eligibleSubtotal * coupon.amount) / 100;
  } else {
    discountAmount = Math.min(coupon.amount, eligibleSubtotal);
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { discountAmount, eligibleSubtotal };
};

const isProductNewArrival = (product) => {
  if (product.restockedAt) {
    return false;
  }
  if (!product.createdAt) {
    return false;
  }
  const createdAt = new Date(product.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }
  const diff = Date.now() - createdAt.getTime();
  return diff >= 0 && diff <= NEW_ARRIVAL_DAYS * DAY_MS;
};

const isProductInStock = (product) => {
  if (product.manageStock === false) {
    return true;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity > 0;
};

const isProductOutOfStock = (product) => {
  if (product.manageStock === false) {
    return false;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity <= 0;
};

const getOrderItemTags = (product) => {
  if (Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG)) {
    return [COMING_SOON_TAG];
  }

  const tags = [];
  if (isProductOnSale(product)) {
    tags.push('on sale');
  }
  if (product.manageStock !== false && product.restockedAt && isProductInStock(product)) {
    tags.push('back in stock');
  }
  if (isProductNewArrival(product)) {
    tags.push('new arrival');
  }
  if (isProductOutOfStock(product)) {
    tags.push('out of stock');
  } else if (isProductInStock(product)) {
    tags.push('in stock');
  }
  return tags;
};

const buildOrderDraft = async ({ payload, user }) => {
  const requestedByProductId = new Map();
  payload.products.forEach((item) => {
    requestedByProductId.set(item.productId, (requestedByProductId.get(item.productId) || 0) + item.quantity);
  });

  const productIds = Array.from(requestedByProductId.keys());
  const products = await Product.find({ _id: { $in: productIds } });
  const foundProducts = new Map(products.map((p) => [p._id.toString(), p]));

  if (foundProducts.size !== productIds.length) {
    throw badRequest('One or more products are invalid');
  }

  const requiresB2BProducts = products.filter((product) => product.requiresB2B);
  if (requiresB2BProducts.length > 0) {
    const isB2BUser = user.clientType === 'B2B';
    const hasVerificationFile = Boolean(user.verificationFileUrl);
    const restrictedProductIds = requiresB2BProducts.map((product) => product._id.toString());

    if (!isB2BUser) {
      throw badRequest(
        'Some products in your cart require a B2B account. Please switch your account to B2B type in your dashboard settings to purchase these products.',
        [{ code: 'b2b_required', productIds: restrictedProductIds }]
      );
    }

    if (!hasVerificationFile) {
      throw badRequest('Verification file is required before placing an order', [
        { code: 'verification_required', productIds: restrictedProductIds },
      ]);
    }
  }

  if (user.clientType === 'C2B') {
    const billing = user.billingAddress;
    const hasBillingAddress = Boolean(
      billing &&
      typeof billing.addressLine1 === 'string' &&
      billing.addressLine1.trim() &&
      typeof billing.city === 'string' &&
      billing.city.trim() &&
      typeof billing.state === 'string' &&
      billing.state.trim() &&
      typeof billing.country === 'string' &&
      billing.country.trim()
    );
    if (!hasBillingAddress) {
      throw badRequest('Billing address is required before placing an order', [
        { code: 'billing_address_required' },
      ]);
    }
  }

  const comingSoonIssues = [];
  const stockIssues = [];
  for (const [productId, requestedQuantity] of requestedByProductId.entries()) {
    const product = foundProducts.get(productId);
    if (Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG)) {
      comingSoonIssues.push({ code: 'coming_soon', productId });
      continue;
    }
    const inventory = product.inventory ?? {};
    const availableQuantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;

    if (isInventoryOutOfStock(inventory)) {
      stockIssues.push({ code: 'out_of_stock', productId, availableQuantity });
      continue;
    }

    if (!inventory.allowBackorder && availableQuantity < requestedQuantity) {
      stockIssues.push({ code: 'insufficient_stock', productId, availableQuantity, requestedQuantity });
    }
  }

  if (comingSoonIssues.length > 0) {
    throw badRequest('Some products are coming soon and cannot be ordered yet', comingSoonIssues);
  }

  if (stockIssues.length > 0) {
    throw badRequest('Some products are out of stock or have insufficient stock', stockIssues);
  }

  let appliedCoupon = null;
  if (payload.couponCode) {
    const coupon = await Coupon.findOne({ code: payload.couponCode });
    if (!coupon || !coupon.isActive) {
      throw badRequest('Coupon is invalid or inactive');
    }

    const { discountAmount, eligibleSubtotal } = computeCouponDiscount(
      coupon,
      payload.products,
      foundProducts
    );

    appliedCoupon = {
      code: coupon.code,
      type: coupon.type,
      amount: coupon.amount,
      discountAmount,
      eligibleSubtotal,
    };
  }

  const orderItems = Array.from(requestedByProductId.entries()).map(([productId, quantity]) => {
    const product = foundProducts.get(productId);
    return {
      productId: product._id,
      name: product.name,
      quantity,
      price: getProductUnitPrice(product),
      tagsAtPurchase: getOrderItemTags(product),
    };
  });

  const orderSubtotalRaw = orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const orderSubtotal = Math.round(orderSubtotalRaw * 100) / 100;
  const orderDiscount = Math.round((appliedCoupon?.discountAmount ?? 0) * 100) / 100;
  const discountedSubtotal = Math.max(0, orderSubtotal - orderDiscount);
  let taxRate = 0;
  let taxAmount = 0;
  let taxCountry = null;
  let taxState = null;

  const isB2BUser = user.clientType === 'B2B';
  const isC2BUser = user.clientType === 'C2B';

  if ((isB2BUser || isC2BUser) && !user.taxExempt) {
    const location = isB2BUser
      ? extractCompanyLocation(user.company)
      : extractCompanyLocation(user.billingAddress);
    const match = await findMatchingTaxRate(location);
    if (match) {
      taxRate = typeof match.rate === 'number' ? match.rate : 0;
      taxCountry = match.country || null;
      taxState = match.state || null;
    }
    taxAmount = Math.round(discountedSubtotal * (taxRate / 100) * 100) / 100;
  }

  let shippingMethod = payload.shippingMethod || 'standard';
  let shippingCost = 0;
  let shippingRateInfo = null;

  if (payload.shippingRate) {
    shippingRateInfo = {
      rateId: payload.shippingRate.rateId,
      carrierId: payload.shippingRate.carrierId,
      carrierCode: payload.shippingRate.carrierCode,
      carrierName: payload.shippingRate.carrierName,
      serviceCode: payload.shippingRate.serviceCode,
      serviceName: payload.shippingRate.serviceName,
      deliveryDays: payload.shippingRate.deliveryDays,
      estimatedDelivery: payload.shippingRate.estimatedDelivery,
    };
    shippingCost = Math.max(0, payload.shippingRate.price || 0);
    shippingMethod = `${payload.shippingRate.carrierName} - ${payload.shippingRate.serviceName}`;
  } else {
    const shippingCosts = { standard: 0, express: 15, overnight: 30 };
    shippingCost = Math.max(0, shippingCosts[shippingMethod] || 0);
  }

  let shippingAddressSnapshot = null;
  if (payload.shippingAddressId && user.shippingAddresses) {
    const selectedAddress = user.shippingAddresses.find(
      (addr) => addr._id?.toString() === payload.shippingAddressId || addr.id === payload.shippingAddressId
    );
    if (selectedAddress) {
      shippingAddressSnapshot = {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        addressLine1: selectedAddress.addressLine1,
        addressLine2: selectedAddress.addressLine2,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country,
      };
    }
  }
  if (!shippingAddressSnapshot && user.shippingAddresses?.length > 0) {
    const defaultAddress = user.shippingAddresses.find((addr) => addr.isDefault) || user.shippingAddresses[0];
    shippingAddressSnapshot = {
      fullName: defaultAddress.fullName,
      phone: defaultAddress.phone,
      addressLine1: defaultAddress.addressLine1,
      addressLine2: defaultAddress.addressLine2,
      city: defaultAddress.city,
      state: defaultAddress.state,
      postalCode: defaultAddress.postalCode,
      country: defaultAddress.country,
    };
  }

  const orderTotal = Math.round((discountedSubtotal + taxAmount + shippingCost) * 100) / 100;

  return {
    requestedByProductId,
    productIds,
    products,
    foundProducts,
    appliedCoupon,
    orderItems,
    orderSubtotal,
    orderDiscount,
    discountedSubtotal,
    taxRate,
    taxAmount,
    taxCountry,
    taxState,
    shippingMethod,
    shippingCost,
    shippingRateInfo,
    shippingAddressSnapshot,
    orderTotal,
  };
};

module.exports = {
  buildOrderDraft,
  normalizeInventoryStatus,
  sanitizeProductTags,
};
