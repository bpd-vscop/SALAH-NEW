const User = require('../models/User');

const sanitizeUsernameBase = (value, fallback = 'user') => {
  const source = (value || fallback).toLowerCase();
  const stripped = source.replace(/[^a-z0-9._-]+/g, '');
  const trimmed = stripped.replace(/^[._-]+|[._-]+$/g, '');
  if (trimmed.length >= 3) {
    return trimmed.slice(0, 30);
  }
  const fallbackBase = fallback.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = fallbackBase.length ? fallbackBase.slice(0, 27) : 'user';
  const randomSuffix = Math.random().toString(36).slice(2, 5);
  return `${base}${randomSuffix}`;
};

const ensureUniqueUsername = async (base) => {
  let candidate = base;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username: candidate })) {
    const suffix = String(counter);
    const truncatedBase = base.slice(0, Math.max(3, 30 - suffix.length));
    candidate = `${truncatedBase}${suffix}`;
    counter += 1;
  }
  return candidate;
};

module.exports = {
  sanitizeUsernameBase,
  ensureUniqueUsername,
};
