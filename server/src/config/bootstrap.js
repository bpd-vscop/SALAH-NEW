const User = require('../models/User');
const { hashPassword } = require('../utils/password');

const ensureDefaultAdmin = async () => {
  const username = process.env.DEFAULT_ADMIN_USERNAME;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!username || !password) {
    return;
  }

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    return;
  }

  const name = process.env.DEFAULT_ADMIN_NAME || 'Store Administrator';
  const passwordHash = await hashPassword(password);

  await User.create({
    name,
    username: username.toLowerCase(),
    role: 'admin',
    status: 'active',
    passwordHash,
  });

  console.log(`Default admin user created (${username.toLowerCase()})`);
};

const bootstrap = async () => {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    console.error('Bootstrap error', error);
  }
};

module.exports = {
  bootstrap,
};
