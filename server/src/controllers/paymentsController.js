const Stripe = require('stripe');
const { randomUUID } = require('crypto');
const { badRequest } = require('../utils/appError');
const { validateCreateOrder } = require('../validators/order');
const { buildOrderDraft } = require('../utils/orderPricing');

// ── PayPal initialisation (from .env only) ────────────────────────
const paypalClientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
const paypalClientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
const paypalMode = (process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
const paypalEnabled =
    paypalClientId.length > 10 &&
    paypalClientSecret.length > 10 &&
    !paypalClientId.startsWith('REPLACE') &&
    !paypalClientSecret.startsWith('REPLACE');

const paypalBaseUrl =
    paypalMode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

// ── Stripe initialisation (from .env only) ─────────────────────
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripePublishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
const stripeEnabled =
    stripeSecretKey.length > 10 &&
    stripePublishableKey.length > 10 &&
    !stripeSecretKey.startsWith('REPLACE') &&
    !stripePublishableKey.startsWith('REPLACE');
const stripe = stripeEnabled ? new Stripe(stripeSecretKey) : null;

// -- Affirm initialisation (from .env only) --
const affirmPublicKey = (process.env.AFFIRM_PUBLIC_API_KEY || '').trim();
const affirmPrivateKey = (process.env.AFFIRM_PRIVATE_API_KEY || '').trim();
const affirmMode = (process.env.AFFIRM_MODE || 'sandbox').trim().toLowerCase();
const affirmMockEnabled =
    affirmMode === 'mock' || String(process.env.AFFIRM_MOCK || '').trim().toLowerCase() === 'true';
const affirmMinTotal = Number(process.env.AFFIRM_MIN_TOTAL || 1000);
const affirmMerchantName = (process.env.AFFIRM_MERCHANT_NAME || 'Store').trim();
const affirmEnabled =
    affirmMockEnabled ||
    (affirmPublicKey.length > 10 &&
        affirmPrivateKey.length > 10 &&
        !affirmPublicKey.startsWith('REPLACE') &&
        !affirmPrivateKey.startsWith('REPLACE'));
const affirmApiBase =
    affirmMode === 'live'
        ? 'https://api.affirm.com'
        : 'https://sandbox.affirm.com';
const affirmScriptUrl =
    affirmMode === 'live'
        ? 'https://cdn1.affirm.com/js/v2/affirm.js'
        : affirmMode === 'sandbox'
            ? 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js'
            : '';

const getClientOrigin = () =>
    (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
        .split(',')[0]
        .trim();

// ── PayPal helper: obtain access token ────────────────────────────
const getPaypalAccessToken = async () => {
    const credentials = Buffer.from(
        `${paypalClientId}:${paypalClientSecret}`
    ).toString('base64');

    const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal auth failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
};

const getAffirmAuthHeader = () =>
    `Basic ${Buffer.from(`${affirmPublicKey}:${affirmPrivateKey}`).toString('base64')}`;

const normalizeCountryCode = (value) => {
    if (!value) return 'USA';
    const trimmed = String(value).trim().toUpperCase();
    if (trimmed === 'UNITED STATES' || trimmed === 'UNITED STATES OF AMERICA' || trimmed === 'US' || trimmed === 'USA') {
        return 'USA';
    }
    if (trimmed.length === 2 || trimmed.length === 3) {
        return trimmed;
    }
    return trimmed;
};

const buildAffirmName = (fullName, fallback) => {
    const name = String(fullName || fallback || '').trim();
    return name ? { full: name } : undefined;
};

const buildAffirmAddress = (address, fallbackName, email, phone) => {
    if (!address) return null;
    const name = buildAffirmName(address.fullName, fallbackName);
    const payload = {
        ...(name ? { name } : {}),
        address: {
            line1: address.addressLine1 || '',
            line2: address.addressLine2 || '',
            city: address.city || '',
            state: address.state || '',
            zipcode: address.postalCode || '',
            country: normalizeCountryCode(address.country),
        },
        email: email || '',
        phone_number: phone || '',
    };
    return payload;
};

const buildAffirmCheckout = ({ draft, user, orderId, publicKey }) => {
    const clientOrigin = getClientOrigin();
    const confirmationUrl = `${clientOrigin.replace(/\/$/, '')}/checkout?affirm=success`;
    const cancelUrl = `${clientOrigin.replace(/\/$/, '')}/checkout?affirm=cancel`;
    const userPhone = `${user.phoneCode || ''}${user.phoneNumber || ''}`.trim();
    const billingAddress = user.billingAddress || draft.shippingAddressSnapshot || null;
    const shippingAddress = draft.shippingAddressSnapshot || billingAddress || null;

    const items = draft.orderItems.map((item) => {
        const product = draft.foundProducts.get(String(item.productId));
        const imageUrl = product?.images?.[0];
        const itemUrl = product ? `${clientOrigin.replace(/\/$/, '')}/products/${product._id}` : undefined;
        return {
            display_name: item.name,
            sku: product?.sku || product?.productCode || String(item.productId),
            unit_price: Math.round((item.price || 0) * 100),
            qty: item.quantity,
            ...(itemUrl ? { item_url: itemUrl } : {}),
            ...(imageUrl ? { item_image_url: imageUrl } : {}),
        };
    });

    const discountAmount = Math.round((draft.orderDiscount || 0) * 100);
    const discounts = discountAmount > 0
        ? {
            [draft.appliedCoupon?.code || 'DISCOUNT']: {
                discount_amount: discountAmount,
            },
        }
        : undefined;

    const shipping = buildAffirmAddress(
        shippingAddress,
        user.name,
        user.email,
        shippingAddress?.phone || userPhone
    );
    const billing = buildAffirmAddress(
        billingAddress,
        user.name,
        user.email,
        billingAddress?.phone || userPhone
    );

    return {
        merchant: {
            public_api_key: publicKey,
            name: affirmMerchantName || 'Store',
            user_confirmation_url: confirmationUrl,
            user_cancel_url: cancelUrl,
        },
        ...(shipping ? { shipping } : {}),
        ...(billing ? { billing } : {}),
        items,
        ...(discounts ? { discounts } : {}),
        metadata: {
            mode: 'modal',
        },
        order_id: orderId,
        currency: 'USD',
        shipping_amount: Math.round((draft.shippingCost || 0) * 100),
        tax_amount: Math.round((draft.taxAmount || 0) * 100),
        total: Math.round((draft.orderTotal || 0) * 100),
    };
};

// ── GET /payments/config ──────────────────────────────────────────
// Returns which payment methods are available + public keys.
// No secrets are ever exposed.
const getPaymentConfig = (_req, res) => {
    const methods = [];

    if (paypalEnabled) {
        methods.push({
            id: 'paypal',
            name: 'PayPal',
            description: 'Fast and secure payment',
        });
    }
    if (stripeEnabled) {
        methods.push({
            id: 'card',
            name: 'Card',
            description: 'Pay with a credit or debit card',
        });
    }
    if (affirmEnabled) {
        methods.push({
            id: 'affirm',
            name: 'Affirm',
            description: 'Split your purchase into monthly payments',
        });
    }

    res.json({
        methods,
        paypal: paypalEnabled
            ? { clientId: paypalClientId, mode: paypalMode }
            : null,
        stripe: stripeEnabled ? { publishableKey: stripePublishableKey } : null,
        affirm: affirmEnabled
            ? {
                publicKey: affirmPublicKey || 'mock_public_key',
                mode: affirmMockEnabled ? 'mock' : affirmMode,
                scriptUrl: affirmMockEnabled ? '' : affirmScriptUrl,
                minTotal: Number.isFinite(affirmMinTotal) ? affirmMinTotal : 1000,
            }
            : null,
    });
};

// ── POST /payments/stripe/create-intent ─────────────────────────
const createStripePaymentIntent = async (req, res, next) => {
    try {
        if (!stripeEnabled || !stripe) {
            throw badRequest('Stripe payments are not configured');
        }

        const payload = validateCreateOrder(req.body || {});
        const draft = await buildOrderDraft({ payload, user: req.user });

        const amountInCents = Math.round(draft.orderTotal * 100);
        if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
            throw badRequest('A positive amount is required');
        }

        const intent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            payment_method_types: ['card'],
            metadata: {
                userId: req.user?._id ? req.user._id.toString() : '',
                coupon: draft.appliedCoupon?.code || '',
                shippingMethod: draft.shippingMethod || 'standard',
            },
        });

        res.json({
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
            amount: draft.orderTotal,
            currency: 'USD',
        });
    } catch (error) {
        next(error);
    }
};

// -- POST /payments/affirm/checkout --
const createAffirmCheckout = async (req, res, next) => {
    try {
        if (!affirmEnabled) {
            throw badRequest('Affirm payments are not configured');
        }

        const payload = validateCreateOrder(req.body || {});
        const draft = await buildOrderDraft({ payload, user: req.user });

        if (!draft.shippingAddressSnapshot) {
            throw badRequest('Shipping address is required for Affirm checkout');
        }

        if (!Number.isFinite(draft.orderTotal) || draft.orderTotal < affirmMinTotal) {
            throw badRequest(`Affirm is available for orders of $${affirmMinTotal} or more`);
        }

        const orderId = randomUUID();
        const checkout = buildAffirmCheckout({
            draft,
            user: req.user,
            orderId,
            publicKey: affirmPublicKey || 'mock_public_key',
        });

        if (affirmMockEnabled) {
            res.json({
                checkout,
                orderId,
                total: draft.orderTotal,
                currency: 'USD',
            });
            return;
        }

        res.json({
            checkout,
            orderId,
            total: draft.orderTotal,
            currency: 'USD',
        });
    } catch (error) {
        next(error);
    }
};

// -- POST /payments/affirm/authorize --
const authorizeAffirmTransaction = async (req, res, next) => {
    try {
        if (!affirmEnabled) {
            throw badRequest('Affirm payments are not configured');
        }

        const { checkoutToken, orderId, ...rest } = req.body || {};
        if (!checkoutToken || typeof checkoutToken !== 'string') {
            throw badRequest('checkoutToken is required');
        }
        if (!orderId || typeof orderId !== 'string') {
            throw badRequest('orderId is required');
        }

        const payload = validateCreateOrder(rest);
        const draft = await buildOrderDraft({ payload, user: req.user });

        if (!draft.shippingAddressSnapshot) {
            throw badRequest('Shipping address is required for Affirm checkout');
        }

        if (!Number.isFinite(draft.orderTotal) || draft.orderTotal < affirmMinTotal) {
            throw badRequest(`Affirm is available for orders of $${affirmMinTotal} or more`);
        }

        if (affirmMockEnabled) {
            const transactionId = `mock_txn_${randomUUID()}`;
            res.json({
                transactionId,
                status: 'authorized',
                amount: draft.orderTotal,
                currency: 'USD',
            });
            return;
        }

        const response = await fetch(`${affirmApiBase}/api/v1/transactions`, {
            method: 'POST',
            headers: {
                Authorization: getAffirmAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transaction_id: checkoutToken,
                order_id: orderId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg =
                errorData?.message ||
                errorData?.details?.[0]?.description ||
                'Failed to authorize Affirm transaction';
            throw badRequest(msg);
        }

        const data = await response.json();
        const amount = Number(data.amount || 0);
        const expectedAmount = Math.round(draft.orderTotal * 100);
        if (amount && expectedAmount && amount !== expectedAmount) {
            throw badRequest('Affirm authorized amount mismatch');
        }

        res.json({
            transactionId: data.id || data.transaction_id || '',
            status: data.status || 'authorized',
            amount: amount ? amount / 100 : draft.orderTotal,
            currency: data.currency || 'USD',
        });
    } catch (error) {
        next(error);
    }
};

// ── POST /payments/paypal/create-order ────────────────────────────
// Creates a PayPal order for the given amount.
const createPaypalOrder = async (req, res, next) => {
    try {
        if (!paypalEnabled) {
            throw badRequest('PayPal payments are not configured');
        }

        const { amount, currency = 'USD' } = req.body || {};

        if (typeof amount !== 'number' || amount <= 0) {
            throw badRequest('A positive amount is required');
        }

        const accessToken = await getPaypalAccessToken();

        const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: currency.toUpperCase(),
                            value: amount.toFixed(2),
                        },
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg =
                errorData?.details?.[0]?.description ||
                errorData?.message ||
                'Failed to create PayPal order';
            throw badRequest(msg);
        }

        const data = await response.json();

        res.json({
            paypalOrderId: data.id,
            status: data.status,
        });
    } catch (error) {
        next(error);
    }
};

// ── POST /payments/paypal/capture ─────────────────────────────────
// Captures (finalises) a PayPal order after user approval.
const capturePaypalOrder = async (req, res, next) => {
    try {
        if (!paypalEnabled) {
            throw badRequest('PayPal payments are not configured');
        }

        const { paypalOrderId } = req.body || {};

        if (!paypalOrderId || typeof paypalOrderId !== 'string') {
            throw badRequest('paypalOrderId is required');
        }

        const accessToken = await getPaypalAccessToken();

        const response = await fetch(
            `${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg =
                errorData?.details?.[0]?.description ||
                errorData?.message ||
                'Failed to capture PayPal order';
            throw badRequest(msg);
        }

        const data = await response.json();
        const capture =
            data.purchase_units?.[0]?.payments?.captures?.[0] || {};

        res.json({
            success: data.status === 'COMPLETED',
            captureId: capture.id || null,
            status: data.status,
        });
    } catch (error) {
        next(error);
    }
};

// ── PayPal: verify an order is COMPLETED ──────────────────────────
const verifyPaypalPayment = async (paypalOrderId) => {
    if (!paypalEnabled) {
        return { verified: false, reason: 'PayPal not configured' };
    }
    try {
        const accessToken = await getPaypalAccessToken();
        const response = await fetch(
            `${paypalBaseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        if (!response.ok) {
            return { verified: false, reason: 'Failed to fetch PayPal order' };
        }
        const data = await response.json();
        if (data.status === 'COMPLETED') {
            const amount = parseFloat(
                data.purchase_units?.[0]?.amount?.value || '0'
            );
            const currency = data.purchase_units?.[0]?.amount?.currency_code || 'USD';
            return { verified: true, amount, currency };
        }
        return { verified: false, reason: `PayPal order status: ${data.status}` };
    } catch (err) {
        return { verified: false, reason: err.message };
    }
};

// ── Stripe: verify a payment intent succeeded ───────────────────
const verifyStripePayment = async (paymentIntentId, expectedAmount, expectedCurrency = 'usd') => {
    if (!stripeEnabled || !stripe) {
        return { verified: false, reason: 'Stripe not configured' };
    }
    try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!intent) {
            return { verified: false, reason: 'Payment intent not found' };
        }

        const amount = typeof intent.amount === 'number' ? intent.amount : 0;
        const currency = intent.currency || '';
        const expectedAmountCents = Math.round((Number(expectedAmount) || 0) * 100);

        if (expectedAmountCents > 0 && amount !== expectedAmountCents) {
            return { verified: false, reason: 'Payment amount mismatch' };
        }

        if (expectedCurrency && currency.toLowerCase() !== expectedCurrency.toLowerCase()) {
            return { verified: false, reason: 'Payment currency mismatch' };
        }

        let cardLast4 = null;
        let cardBrand = null;
        if (intent.payment_method && typeof intent.payment_method === 'string') {
            try {
                const paymentMethod = await stripe.paymentMethods.retrieve(intent.payment_method);
                if (paymentMethod?.card) {
                    cardLast4 = paymentMethod.card.last4 || null;
                    cardBrand = paymentMethod.card.brand || null;
                }
            } catch (_err) {
                cardLast4 = null;
                cardBrand = null;
            }
        }

        if (intent.status === 'succeeded' || intent.status === 'processing') {
            return {
                verified: true,
                amount: amount / 100,
                currency,
                status: intent.status,
                cardLast4,
                cardBrand,
            };
        }
        return { verified: false, reason: `Payment status: ${intent.status}` };
    } catch (err) {
        return { verified: false, reason: err.message };
    }
};

// -- Affirm: verify a transaction --
const verifyAffirmPayment = async (transactionId, expectedAmount, expectedCurrency = 'usd') => {
    if (!affirmEnabled) {
        return { verified: false, reason: 'Affirm not configured' };
    }
    if (affirmMockEnabled) {
        return {
            verified: true,
            amount: Number(expectedAmount) || 0,
            currency: expectedCurrency,
            status: 'authorized',
        };
    }
    try {
        const response = await fetch(
            `${affirmApiBase}/api/v1/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: getAffirmAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );
        if (!response.ok) {
            return { verified: false, reason: 'Failed to fetch Affirm transaction' };
        }
        const data = await response.json();
        const amount = Number(data.amount || 0);
        const currency = data.currency || '';
        const expectedAmountCents = Math.round((Number(expectedAmount) || 0) * 100);

        if (expectedAmountCents > 0 && amount && amount !== expectedAmountCents) {
            return { verified: false, reason: 'Payment amount mismatch' };
        }
        if (expectedCurrency && currency && currency.toLowerCase() !== expectedCurrency.toLowerCase()) {
            return { verified: false, reason: 'Payment currency mismatch' };
        }

        return {
            verified: true,
            amount: amount ? amount / 100 : Number(expectedAmount) || 0,
            currency: currency || expectedCurrency,
            status: data.status || null,
        };
    } catch (err) {
        return { verified: false, reason: err.message };
    }
};

// -- Affirm: capture a transaction (use after shipment) --
const captureAffirmTransaction = async (transactionId, amount) => {
    if (!affirmEnabled) {
        return { captured: false, reason: 'Affirm not configured' };
    }
    if (affirmMockEnabled) {
        return { captured: true, status: 'captured' };
    }
    try {
        const response = await fetch(
            `${affirmApiBase}/api/v1/transactions/${encodeURIComponent(transactionId)}/capture`,
            {
                method: 'POST',
                headers: {
                    Authorization: getAffirmAuthHeader(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: Math.round((Number(amount) || 0) * 100),
                }),
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg =
                errorData?.message ||
                errorData?.details?.[0]?.description ||
                'Failed to capture Affirm transaction';
            return { captured: false, reason: msg };
        }
        const data = await response.json();
        return { captured: true, status: data.status || 'captured' };
    } catch (err) {
        return { captured: false, reason: err.message };
    }
};

module.exports = {
    getPaymentConfig,
    createPaypalOrder,
    capturePaypalOrder,
    verifyPaypalPayment,
    createStripePaymentIntent,
    verifyStripePayment,
    createAffirmCheckout,
    authorizeAffirmTransaction,
    verifyAffirmPayment,
    captureAffirmTransaction,
};
