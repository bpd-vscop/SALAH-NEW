const Stripe = require('stripe');
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

    res.json({
        methods,
        paypal: paypalEnabled
            ? { clientId: paypalClientId, mode: paypalMode }
            : null,
        stripe: stripeEnabled ? { publishableKey: stripePublishableKey } : null,
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

module.exports = {
    getPaymentConfig,
    createPaypalOrder,
    capturePaypalOrder,
    verifyPaypalPayment,
    createStripePaymentIntent,
    verifyStripePayment,
};
