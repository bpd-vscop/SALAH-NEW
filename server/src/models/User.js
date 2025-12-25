const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const companyInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    businessType: { type: String, trim: true },
    taxId: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Morocco' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    phoneCode: {
      type: String,
      trim: true,
      default: null,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      required: function requireUsername() {
        return this.role && this.role !== 'client';
      },
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'staff', 'client'],
      default: 'client',
    },
    clientType: {
      type: String,
      enum: ['B2B', 'C2B'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    accountUpdatedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    accountUpdatedByName: {
      type: String,
      trim: true,
      default: null,
    },
    accountUpdatedByRole: {
      type: String,
      enum: ['super_admin', 'admin', 'staff', 'client'],
      default: null,
    },
    verificationFileUrl: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
    company: {
      type: companyInfoSchema,
      default: undefined,
    },
    shippingAddresses: {
      type: [shippingAddressSchema],
      default: [],
    },
    cart: {
      type: [cartItemSchema],
      default: [],
    },
    wishlist: {
      type: [wishlistItemSchema],
      default: [],
    },
    orderHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
  },
  {
    timestamps: { createdAt: 'accountCreated', updatedAt: 'accountUpdated' },
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.accountCreated = ret.accountCreated ? new Date(ret.accountCreated).toISOString() : null;
        ret.accountUpdated = ret.accountUpdated ? new Date(ret.accountUpdated).toISOString() : null;
        ret.accountUpdatedById = ret.accountUpdatedById ? ret.accountUpdatedById.toString() : null;
        ret.accountUpdatedByName = ret.accountUpdatedByName || null;
        ret.accountUpdatedByRole = ret.accountUpdatedByRole || null;
        ret.lastActiveAt = ret.lastActiveAt ? new Date(ret.lastActiveAt).toISOString() : null;
        ret.cart = Array.isArray(ret.cart)
          ? ret.cart.map((item) => ({
              productId: item.productId ? item.productId.toString() : null,
              quantity: item.quantity,
            }))
          : [];
        ret.wishlist = Array.isArray(ret.wishlist)
          ? ret.wishlist.map((item) => ({
              productId: item.productId ? item.productId.toString() : null,
              quantity: item.quantity,
            }))
          : [];
        ret.orderHistory = Array.isArray(ret.orderHistory)
          ? ret.orderHistory.map((id) => id.toString())
          : [];
        delete ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        ret.username = ret.username || null;
        ret.email = ret.email || null;
        ret.phoneCode = ret.phoneCode || null;
        ret.phoneNumber = ret.phoneNumber || null;
        ret.clientType = ret.clientType || null;
        ret.profileImage = ret.profileImage || null;
        ret.isEmailVerified =
          typeof ret.isEmailVerified === 'boolean' ? ret.isEmailVerified : true;
        ret.company = ret.company
          ? {
              name: ret.company.name || null,
              address: ret.company.address || null,
              phone: ret.company.phone || null,
              businessType: ret.company.businessType || null,
              taxId: ret.company.taxId || null,
              website: ret.company.website || null,
            }
          : null;
        ret.shippingAddresses = Array.isArray(ret.shippingAddresses)
          ? ret.shippingAddresses.map((addr) => ({
              id: addr._id ? addr._id.toString() : null,
              fullName: addr.fullName || null,
              phone: addr.phone || null,
              addressLine1: addr.addressLine1 || null,
              addressLine2: addr.addressLine2 || null,
              city: addr.city || null,
              state: addr.state || null,
              postalCode: addr.postalCode || null,
              country: addr.country || 'Morocco',
              isDefault: addr.isDefault || false,
            }))
          : [];
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
