const TaxRate = require('../models/TaxRate');
const { validateCreateTaxRate, validateUpdateTaxRate } = require('../validators/taxRate');
const { badRequest, notFound } = require('../utils/appError');
const { normalizeLocation, extractCompanyLocation, findMatchingTaxRate } = require('../utils/taxRates');

const applyLocationKeys = (taxRate) => {
  const countryKey = normalizeLocation(taxRate.country);
  const stateKey = normalizeLocation(taxRate.state);
  taxRate.countryKey = countryKey;
  taxRate.stateKey = stateKey;
  return { countryKey, stateKey };
};

const ensureUniqueLocation = async ({ countryKey, stateKey, excludeId }) => {
  const existing = await TaxRate.findOne({
    countryKey,
    stateKey,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (existing) {
    throw badRequest('Tax rate already exists for this location');
  }
};

const listTaxRates = async (_req, res, next) => {
  try {
    const taxRates = await TaxRate.find().sort({ countryKey: 1, stateKey: 1, createdAt: -1 });
    res.json({ taxRates: taxRates.map((rate) => rate.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createTaxRate = async (req, res, next) => {
  try {
    const data = validateCreateTaxRate(req.body || {});
    const taxRate = new TaxRate({
      country: data.country ?? null,
      state: data.state ?? null,
      rate: data.rate,
    });
    const { countryKey, stateKey } = applyLocationKeys(taxRate);
    if (!countryKey && !stateKey) {
      throw badRequest('Country or state is required');
    }
    await ensureUniqueLocation({ countryKey, stateKey });
    await taxRate.save();
    res.status(201).json({ taxRate: taxRate.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateTaxRate(req.body || {});
    const taxRate = await TaxRate.findById(id);
    if (!taxRate) {
      throw notFound('Tax rate not found');
    }

    if (Object.prototype.hasOwnProperty.call(data, 'country')) {
      taxRate.country = data.country ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'state')) {
      taxRate.state = data.state ?? null;
    }
    if (typeof data.rate !== 'undefined') {
      taxRate.rate = data.rate;
    }

    const { countryKey, stateKey } = applyLocationKeys(taxRate);
    if (!countryKey && !stateKey) {
      throw badRequest('Country or state is required');
    }
    await ensureUniqueLocation({ countryKey, stateKey, excludeId: id });
    await taxRate.save();
    res.json({ taxRate: taxRate.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxRate = await TaxRate.findByIdAndDelete(id);
    if (!taxRate) {
      throw notFound('Tax rate not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const resolveTaxRate = async (req, res, next) => {
  try {
    const country = typeof req.query.country === 'string' ? req.query.country : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const hasQuery = Boolean(country || state);
    const location = hasQuery ? { country, state } : extractCompanyLocation(req.user?.company);
    const match = await findMatchingTaxRate(location);
    res.json({ taxRate: match ? match.toJSON() : null });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  resolveTaxRate,
};
