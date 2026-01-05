const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { badRequest, notFound } = require('../utils/appError');

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeOptionalText = (value) => {
  const trimmed = normalizeText(value);
  return trimmed ? trimmed : null;
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureInvoiceNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `INV${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Invoice.exists({ invoiceNumber: candidate });
    if (!exists) {
      return candidate;
    }
  }
  throw badRequest('Unable to generate invoice number');
};

const normalizeAddress = (input, fallback = {}) => ({
  companyName: normalizeOptionalText(input?.companyName) || normalizeOptionalText(fallback?.companyName),
  name: normalizeText(input?.name) || normalizeText(fallback?.name),
  email: normalizeOptionalText(input?.email) || normalizeOptionalText(fallback?.email),
  phone: normalizeOptionalText(input?.phone) || normalizeOptionalText(fallback?.phone),
  addressLine1: normalizeText(input?.addressLine1) || normalizeText(fallback?.addressLine1),
  addressLine2: normalizeOptionalText(input?.addressLine2) || normalizeOptionalText(fallback?.addressLine2),
  city: normalizeOptionalText(input?.city) || normalizeOptionalText(fallback?.city),
  state: normalizeOptionalText(input?.state) || normalizeOptionalText(fallback?.state),
  postalCode: normalizeOptionalText(input?.postalCode) || normalizeOptionalText(fallback?.postalCode),
  country: normalizeOptionalText(input?.country) || normalizeOptionalText(fallback?.country) || 'United States',
});

const listInvoices = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && ['pending', 'completed', 'canceled'].includes(String(status))) {
      filter.status = status;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { invoiceNumber: pattern },
        { 'billTo.name': pattern },
        { 'billTo.email': pattern },
        { 'shipTo.name': pattern },
        { 'items.name': pattern },
      ];
    }
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json({ invoices: invoices.map((invoice) => invoice.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Invoice not found');
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw notFound('Invoice not found');
    }
    res.json({ invoice: invoice.toJSON() });
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const billTo = normalizeAddress(payload.billTo);
    if (!billTo.name) {
      throw badRequest('Billing name is required');
    }
    if (!billTo.addressLine1) {
      throw badRequest('Billing address is required');
    }

    const shipTo = normalizeAddress(payload.shipTo, billTo);
    if (!shipTo.name) {
      throw badRequest('Shipping name is required');
    }
    if (!shipTo.addressLine1) {
      throw badRequest('Shipping address is required');
    }

    const itemsInput = Array.isArray(payload.items) ? payload.items : [];
    if (!itemsInput.length) {
      throw badRequest('Invoice items are required');
    }

    const items = itemsInput.map((item) => {
      const name = normalizeText(item?.name);
      if (!name) {
        throw badRequest('Each item must have a name');
      }
      const quantity = parseNumber(item?.quantity, NaN);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw badRequest('Each item must have a quantity of at least 1');
      }
      const price = parseNumber(item?.price, NaN);
      if (!Number.isFinite(price) || price < 0) {
        throw badRequest('Each item must have a valid price');
      }
      const productId = item?.productId;
      if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
        throw badRequest('Invalid product identifier on invoice item');
      }
      return {
        productId: productId || null,
        name,
        sku: normalizeOptionalText(item?.sku),
        quantity,
        price,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxRate = Math.max(0, parseNumber(payload.taxRate, 0));
    const rawTaxAmount = parseNumber(payload.taxAmount, NaN);
    const taxAmount = Number.isFinite(rawTaxAmount)
      ? Math.max(0, rawTaxAmount)
      : Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const shippingAmount = Math.max(0, parseNumber(payload.shippingAmount, 0));
    const total = Math.max(0, subtotal + taxAmount + shippingAmount);

    let customerId = null;
    if (payload.customerId) {
      if (!mongoose.Types.ObjectId.isValid(payload.customerId)) {
        throw badRequest('Invalid customer identifier');
      }
      customerId = payload.customerId;
      const exists = await User.exists({ _id: customerId });
      if (!exists) {
        throw badRequest('Customer not found');
      }
    }

    const status = ['pending', 'completed', 'canceled'].includes(payload.status)
      ? payload.status
      : 'pending';

    const invoiceNumber = await ensureInvoiceNumber();
    const invoice = await Invoice.create({
      invoiceNumber,
      customerId,
      billTo,
      shipTo,
      items,
      status,
      subtotal,
      taxRate,
      taxAmount,
      shippingAmount,
      total,
      currency: normalizeOptionalText(payload.currency) || 'USD',
      terms: normalizeOptionalText(payload.terms),
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      notes: normalizeOptionalText(payload.notes),
      createdBy: req.user?._id ?? null,
    });

    res.status(201).json({ invoice: invoice.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Invoice not found');
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw notFound('Invoice not found');
    }
    await Invoice.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  deleteInvoice,
};
