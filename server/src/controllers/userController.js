const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const { validateCreateUser, validateUpdateUser, validateConvertToB2B } = require('../validators/user');
const { validateAdminProfile } = require('../validators/adminProfile');
const { hashPassword } = require('../utils/password');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { canView, canEdit, rank, ROLE_RANK } = require('../utils/roles');
const {
  issuePasswordChangeCode,
  verifyPasswordChangeCode,
  issueVerificationCode,
} = require('../services/verificationCodeService');
const { sendPasswordChangedConfirmation } = require('../services/emailService');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseCsvParam = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const listUsers = async (req, res, next) => {
  try {
    const {
      role: roleQuery,
      status: statusQuery,
      clientType: clientTypeQuery,
      search: searchQuery,
      sort: sortQuery,
      emailVerified: emailVerifiedQuery,
    } = req.query || {};

    const accessibleRoles = Object.keys(ROLE_RANK).filter((role) =>
      req.user ? canView(req.user.role, role) : true
    );

    let requestedRoles = accessibleRoles;
    if (roleQuery) {
      const requested = parseCsvParam(roleQuery).filter((role) => ROLE_RANK[role] !== undefined);
      requestedRoles = requested.filter((role) => accessibleRoles.includes(role));
    }

    const filter = {};
    if (requestedRoles.length > 0) {
      filter.role = { $in: requestedRoles };
    } else if (roleQuery) {
      // If caller requested roles they cannot access, return empty list early
      return res.json({ users: [] });
    }

    if (statusQuery) {
      const statuses = parseCsvParam(statusQuery).filter((status) => ['active', 'inactive'].includes(status));
      if (statuses.length > 0) {
        filter.status = { $in: statuses };
      }
    }

    if (clientTypeQuery) {
      const clientTypes = parseCsvParam(clientTypeQuery).filter((type) => ['B2B', 'C2B'].includes(type));
      if (clientTypes.length > 0) {
        filter.clientType = { $in: clientTypes };
      }
    }

    if (typeof emailVerifiedQuery === 'string' && emailVerifiedQuery.length > 0) {
      const normalized = emailVerifiedQuery.toLowerCase();
      if (normalized === 'true' || normalized === 'false') {
        filter.isEmailVerified = normalized === 'true';
      }
    }

    if (searchQuery) {
      const trimmed = String(searchQuery).trim();
      if (trimmed) {
        const pattern = new RegExp(escapeRegex(trimmed), 'i');
        filter.$or = [
          { name: pattern },
          { email: pattern },
          { username: pattern },
          { phoneNumber: pattern },
        ];
      }
    }

    let sort = { accountCreated: -1, _id: -1 };
    switch (String(sortQuery || '').toLowerCase()) {
      case 'oldest':
        sort = { accountCreated: 1, _id: 1 };
        break;
      case 'name-asc':
      case 'a-to-z':
      case 'a_z':
        sort = { name: 1, accountCreated: -1 };
        break;
      case 'name-desc':
      case 'z-to-a':
      case 'z_a':
        sort = { name: -1, accountCreated: -1 };
        break;
      case 'recently-updated':
      case 'updated':
        sort = { accountUpdated: -1, accountCreated: -1 };
        break;
      default:
        sort = { accountCreated: -1, _id: -1 };
    }

    const users = await User.find(filter).sort(sort);
    const visible = req.user ? users.filter((u) => canView(req.user.role, u.role)) : users;
    res.json({ users: visible.map((u) => u.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const sendClientVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    if (user.role !== 'client') {
      throw badRequest('Verification emails are only available for client accounts');
    }

    if (!req.user || !canEdit(req.user.role, user.role)) {
      throw forbidden('You do not have permission to send verification emails for this user');
    }

    if (!user.email) {
      throw badRequest('Client does not have an email address', [{ field: 'email' }]);
    }

    if (user.isEmailVerified === true) {
      return res.json({
        message: 'Email is already verified',
        alreadyVerified: true,
      });
    }

    const { expiresAt, previewCode } = await issueVerificationCode({
      email: user.email,
      fullName: user.name,
      clientType: user.clientType || 'C2B',
    });

    res.json({
      message: 'Verification email sent',
      expiresAt: expiresAt.toISOString(),
      ...(previewCode ? { previewCode } : {}),
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = validateCreateUser(req.body || {});

    if (data.username) {
      const existing = await User.findOne({ username: data.username });
      if (existing) {
        throw badRequest('Username already in use', [{ field: 'username' }]);
      }
    }

    if (data.email) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
      if (existingEmail) {
        throw badRequest('Email already in use', [{ field: 'email' }]);
      }
    }

    // Only allow creating users with a role strictly below the creator's role
    if (req.user && !canEdit(req.user.role, data.role)) {
      throw forbidden('Insufficient privileges to create a user with this role');
    }

    const role = data.role;
    const normalizedName = data.name ?? (role === 'client' ? 'New Client' : undefined);

    if (role !== 'client' && !normalizedName) {
      throw badRequest('Name is required for this role', [{ field: 'name' }]);
    }

    const resolvedPassword =
      data.password ||
      crypto.randomBytes(12).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) ||
      crypto.randomBytes(9).toString('hex');
    const passwordHash = await hashPassword(resolvedPassword);

    const user = await User.create({
      name: normalizedName || 'New Team Member',
      username: role === 'client' ? undefined : data.username,
      email: data.email?.toLowerCase(),
      role,
      status: data.status,
      passwordHash,
      clientType: role === 'client' ? data.clientType ?? undefined : undefined,
      isEmailVerified: role !== 'client',
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...(req.body || {}) };

    // Handle file uploads (either single file or multiple fields)
    if (req.file) {
      // Single file upload
      if (req.file.fieldname === 'profileImage') {
        payload.profileImage = `profile/${req.file.filename}`;
        payload.removeProfileImage = false;
      } else if (req.file.fieldname === 'verificationFile') {
        payload.verificationFileUrl = `verification/${req.file.filename}`;
      }
    } else if (req.files) {
      // Multiple file fields upload
      if (req.files.profileImage && req.files.profileImage[0]) {
        payload.profileImage = `profile/${req.files.profileImage[0].filename}`;
        payload.removeProfileImage = false;
      }
      if (req.files.verificationFile && req.files.verificationFile[0]) {
        payload.verificationFileUrl = `verification/${req.files.verificationFile[0].filename}`;
      }
    }

    const data = validateUpdateUser(payload);

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);

    // Allow users to edit their own profile
    if (isSelf) {
      // Users can only update their own basic info (name, phone, profile image)
      // Prevent clients from changing role, status, etc.
      if (user.role === 'client' && (data.role || data.status)) {
        throw forbidden('You cannot change your role or status');
      }
    } else {
      // Prevent editing other users with equal or higher role
      if (req.user && !canEdit(req.user.role, user.role)) {
        throw forbidden('You cannot edit a user with higher or equal role');
      }
    }

    if (isSelf && ['admin', 'super_admin'].includes(user.role)) {
      const profileImageValue = Object.prototype.hasOwnProperty.call(data, 'profileImage')
        ? data.profileImage
        : data.removeProfileImage
        ? null
        : user.profileImage ?? null;

      validateAdminProfile({
        fullName: data.fullName ?? data.name ?? user.name,
        email: data.email ?? user.email,
        profileImage: profileImageValue,
      });
    }

    const desiredRole = data.role || user.role;
    const actorCanEditTarget = !isSelf && req.user && canEdit(req.user.role, user.role);
    const actorHasClientAdminPrivileges =
      actorCanEditTarget && req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    const ensureClientCompany = () => {
      if (user.role !== 'client') {
        throw forbidden('Only client accounts can update company information');
      }
      if (!user.company) {
        user.company = {};
      }
      return user.company;
    };

    let companyModified = false;

    if (Object.prototype.hasOwnProperty.call(data, 'username')) {
      const providedUsername = data.username ?? undefined;
      if (desiredRole === 'client') {
        if (providedUsername) {
          throw badRequest('Clients do not use usernames', [{ field: 'username' }]);
        }
        user.username = undefined;
        user.set('username', undefined);
      } else {
        if (!providedUsername) {
          throw badRequest('Username is required for this role', [{ field: 'username' }]);
        }
        if (providedUsername !== user.username) {
          const existing = await User.findOne({ username: providedUsername });
          if (existing) {
            throw badRequest('Username already in use', [{ field: 'username' }]);
          }
          user.username = providedUsername;
        }
      }
    }

    if (data.email && data.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
      if (existingEmail && existingEmail.id !== user.id) {
        throw badRequest('Email already in use', [{ field: 'email' }]);
      }
      user.email = data.email.toLowerCase();
      if (user.role !== 'client') {
        user.isEmailVerified = true;
      }
    }

    if (data.fullName) {
      user.name = data.fullName;
    } else if (data.name) {
      user.name = data.name;
    }

    // Update phone if provided
    if (data.phoneCode !== undefined) {
      user.phoneCode = data.phoneCode || null;
    }
    if (data.phoneNumber !== undefined) {
      user.phoneNumber = data.phoneNumber || null;
    }

    if (data.role) {
      if (req.user) {
        const actorRank = rank(req.user.role);
        const desiredRank = rank(data.role);
        if (isSelf) {
          // Allow same or lower role; forbid elevation
          if (desiredRank > actorRank) {
            throw forbidden('You cannot elevate your own role');
          }
        } else {
          // For other users: actor must be strictly higher than assigned role
          if (actorRank <= desiredRank) {
            throw forbidden('You cannot assign a role equal or higher than your own');
          }
        }
      }
      user.role = data.role;
    }

    if (user.role !== 'client' && !user.username) {
      throw badRequest('Username is required for this role', [{ field: 'username' }]);
    }
    if (user.role === 'client' && user.username) {
      user.username = undefined;
      user.set('username', undefined);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'clientType')) {
      if (user.role !== 'client') {
        throw forbidden('Only client accounts can update client type');
      }
      if (!actorHasClientAdminPrivileges) {
        throw forbidden('You do not have permission to change client type');
      }
      user.clientType = data.clientType;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyName')) {
      const company = ensureClientCompany();
      company.name = data.companyName ?? null;
      companyModified = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyPhone')) {
      const company = ensureClientCompany();
      company.phone = data.companyPhone ?? null;
      companyModified = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyAddress')) {
      const company = ensureClientCompany();
      company.address = data.companyAddress ?? null;
      companyModified = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyBusinessType')) {
      const company = ensureClientCompany();
      company.businessType = data.companyBusinessType ?? null;
      companyModified = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyTaxId')) {
      const company = ensureClientCompany();
      const requestedTaxId = data.companyTaxId ?? null;

      if (!actorHasClientAdminPrivileges) {
        if (company.taxId && requestedTaxId && company.taxId !== requestedTaxId) {
          throw forbidden('Tax ID is already set for this account');
        }
        if (!requestedTaxId) {
          throw badRequest('Tax ID is required');
        }
      }

      company.taxId = requestedTaxId;
      companyModified = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'companyWebsite')) {
      const company = ensureClientCompany();
      const requestedWebsite = data.companyWebsite ?? null;

      if (!actorHasClientAdminPrivileges) {
        if (company.website && requestedWebsite && company.website !== requestedWebsite) {
          throw forbidden('Company website is already set');
        }
        if (!requestedWebsite) {
          throw badRequest('Company website is required');
        }
      }

      company.website = requestedWebsite;
      companyModified = true;
    }

    if (companyModified) {
      user.markModified('company');
    }

    if (data.status) {
      user.status = data.status;
    }
    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'profileImage')) {
      user.profileImage = data.profileImage;
    } else if (data.removeProfileImage) {
      user.profileImage = null;
    }

    // Update verification file URL if provided
    if (Object.prototype.hasOwnProperty.call(data, 'verificationFileUrl')) {
      user.verificationFileUrl = data.verificationFileUrl;
    }

    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      throw badRequest('You cannot delete your own account');
    }

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    if (req.user && !canEdit(req.user.role, user.role)) {
      throw forbidden('You cannot delete a user with higher or equal role');
    }

    await User.findByIdAndDelete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const addShippingAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf) {
      throw forbidden('You can only manage your own shipping addresses');
    }

    // If this is set as default, unset all other defaults
    if (data.isDefault) {
      user.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    if (user.shippingAddresses.length === 0) {
      data.isDefault = true;
    }

    user.shippingAddresses.push({
      fullName: data.fullName || null,
      phone: data.phone || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || 'Morocco',
      isDefault: data.isDefault || false,
    });

    await user.save();

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateShippingAddress = async (req, res, next) => {
  try {
    const { id, addressId } = req.params;
    const data = req.body || {};

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf) {
      throw forbidden('You can only manage your own shipping addresses');
    }

    const address = user.shippingAddresses.id(addressId);
    if (!address) {
      throw notFound('Shipping address not found');
    }

    // If setting as default, unset all other defaults
    if (data.isDefault && !address.isDefault) {
      user.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Update fields
    if (data.fullName !== undefined) address.fullName = data.fullName;
    if (data.phone !== undefined) address.phone = data.phone;
    if (data.addressLine1 !== undefined) address.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) address.addressLine2 = data.addressLine2;
    if (data.city !== undefined) address.city = data.city;
    if (data.state !== undefined) address.state = data.state;
    if (data.postalCode !== undefined) address.postalCode = data.postalCode;
    if (data.country !== undefined) address.country = data.country;
    if (data.isDefault !== undefined) address.isDefault = data.isDefault;

    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteShippingAddress = async (req, res, next) => {
  try {
    const { id, addressId } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf) {
      throw forbidden('You can only manage your own shipping addresses');
    }

    const address = user.shippingAddresses.id(addressId);
    if (!address) {
      throw notFound('Shipping address not found');
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // If we deleted the default address, make the first remaining address default
    if (wasDefault && user.shippingAddresses.length > 0) {
      user.shippingAddresses[0].isDefault = true;
    }

    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const requestPasswordChange = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf) {
      throw forbidden('You can only change your own password');
    }

    if (!user.email) {
      throw badRequest('No email associated with this account');
    }

    const { previewCode } = await issuePasswordChangeCode({
      email: user.email,
      fullName: user.name,
    });

    res.json({
      message: 'Verification code sent to your email',
      ...(previewCode ? { previewCode } : {}),
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, newPassword } = req.body || {};

    if (!code || !newPassword) {
      throw badRequest('Verification code and new password are required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf) {
      throw forbidden('You can only change your own password');
    }

    if (!user.email) {
      throw badRequest('No email associated with this account');
    }

    // Verify the code
    const verification = await verifyPasswordChangeCode({
      email: user.email,
      code,
    });

    if (!verification.valid) {
      throw badRequest(verification.error || 'Invalid verification code');
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordChangedConfirmation({
        email: user.email,
        fullName: user.name,
      });
    } catch (emailError) {
      console.error('Failed to send password change confirmation email:', emailError);
      // Don't fail the password change if email fails
    }

    res.json({
      message: 'Password changed successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

const convertToB2B = async (req, res, next) => {
  const uploadedFilePath = req.file?.path;
  try {
    const data = validateConvertToB2B(req.body || {});
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    if (!isSelf && (!req.user || !canEdit(req.user.role, user.role))) {
      throw forbidden('You cannot convert this account');
    }

    if (user.role !== 'client') {
      throw badRequest('Only client accounts can be converted to B2B');
    }

    if (user.clientType === 'B2B') {
      if (uploadedFilePath) {
        await fs.unlink(uploadedFilePath).catch(() => {});
      }
      return res.json({
        message: 'Account is already a B2B account',
        user: user.toJSON(),
      });
    }

    if (req.file) {
      const relativePath = path.posix.join('/uploads/verification', req.file.filename);
      user.verificationFileUrl = relativePath;
    }

    const existingCompany = user.company || {};
    user.clientType = 'B2B';
    user.company = {
      name: data.companyName,
      businessType: data.businessType,
      taxId: data.taxId ?? null,
      website: data.website ?? null,
      phone: existingCompany.phone ?? null,
      address: existingCompany.address ?? null,
    };

    await user.save();

    res.json({
      message: 'Account converted to B2B successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }
    next(error);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  addShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  requestPasswordChange,
  changePassword,
  sendClientVerification,
  convertToB2B,
};
