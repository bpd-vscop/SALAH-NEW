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
    role: 'super_admin',
    status: 'active',
    passwordHash,
  });

  console.log(`Default admin user created (${username.toLowerCase()})`);
};

const migrateRolesIfNeeded = async () => {
  const enabled = String(process.env.ENABLE_ROLE_MIGRATION).toLowerCase() === 'true';
  if (!enabled) {
    return;
  }
  const resManager = await User.updateMany({ role: 'manager' }, { $set: { role: 'admin' } });
  const resAdmin = await User.updateMany({ role: 'admin' }, { $set: { role: 'super_admin' } });
  if ((resManager.modifiedCount || 0) > 0) {
    console.log(`Role migration: manager → admin (${resManager.modifiedCount})`);
  }
  if ((resAdmin.modifiedCount || 0) > 0) {
    console.log(`Role migration: admin → super_admin (${resAdmin.modifiedCount})`);
  }
};

const bootstrap = async () => {
  try {
    await migrateRolesIfNeeded();
    const seedDefault = String(process.env.SEED_DEFAULT_ADMIN).toLowerCase() === 'true';
    if (seedDefault) {
      await ensureDefaultAdmin();
    }
  } catch (error) {
    console.error('Bootstrap error', error);
  }
};

module.exports = {
  bootstrap,
};
