const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be at least 8 characters and include at least two of the following: uppercase letter, number, special character.';

const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

const comparePassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};

const meetsPasswordComplexity = (password) => {
  if (typeof password !== 'string') {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const satisfiedCategories = [hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  return satisfiedCategories >= 2;
};

module.exports = {
  hashPassword,
  comparePassword,
  meetsPasswordComplexity,
  PASSWORD_COMPLEXITY_MESSAGE,
};
