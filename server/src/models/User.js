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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9._%+-@]+$/,
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
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    verificationFileUrl: {
      type: String,
      default: null,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    clientType: {
      type: String,
      enum: ['B2B', 'C2B', null],
      default: null,
    },
    company: {
      name: { type: String, default: null },
      address: { type: String, default: null },
      phone: { type: String, default: null },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    cart: {
      type: [cartItemSchema],
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
        ret.email = ret.email || null;
        ret.profileImageUrl = ret.profileImageUrl || null;
        ret.clientType = ret.clientType || null;
        ret.company = ret.company
          ? {
              name: ret.company.name || null,
              address: ret.company.address || null,
              phone: ret.company.phone || null,
            }
          : { name: null, address: null, phone: null };
        ret.isEmailVerified = Boolean(ret.isEmailVerified);
        ret.emailVerifiedAt = ret.emailVerifiedAt
          ? new Date(ret.emailVerifiedAt).toISOString()
          : null;
        ret.cart = Array.isArray(ret.cart)
          ? ret.cart.map((item) => ({
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
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
