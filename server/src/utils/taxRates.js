const TaxRate = require('../models/TaxRate');

const normalizeLocation = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
};

const extractCompanyLocation = (company) => {
  if (!company || typeof company !== 'object') {
    return { country: null, state: null };
  }
  if (company.country || company.state) {
    return {
      country: company.country || null,
      state: company.state || null,
    };
  }
  const address = typeof company.address === 'string' ? company.address : '';
  if (!address) {
    return { country: null, state: null };
  }
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) {
    return { country: null, state: null };
  }
  const country = parts[parts.length - 1] || null;
  const state = parts.length > 1 ? parts[parts.length - 2] || null : null;
  return { country, state };
};

const findMatchingTaxRate = async ({ country, state }) => {
  const countryKey = normalizeLocation(country);
  const stateKey = normalizeLocation(state);

  let match = null;
  if (countryKey && stateKey) {
    match = await TaxRate.findOne({ countryKey, stateKey });
  }
  if (!match && countryKey) {
    match = await TaxRate.findOne({ countryKey, stateKey: null });
  }
  if (!match && stateKey) {
    match = await TaxRate.findOne({ countryKey: null, stateKey });
  }

  return match;
};

module.exports = {
  normalizeLocation,
  extractCompanyLocation,
  findMatchingTaxRate,
};
