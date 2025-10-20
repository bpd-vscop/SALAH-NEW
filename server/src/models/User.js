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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9._@-]{3,120}$/,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /.+@.+\..+/, // simple validation, stricter validation happens in validators
      unique: true,
      sparse: true,
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
    clientType: {
      type: String,
      enum: ['B2B', 'C2B', null],
      default: null,
    },
    company: {
      name: {
        type: String,
        default: null,
        trim: true,
      },
      address: {
        type: String,
        default: null,
        trim: true,
      },
      phone: {
        type: String,
        default: null,
        trim: true,
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    verificationFileUrl: {
      type: String,
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
        ret.cart = Array.isArray(ret.cart)
          ? ret.cart.map((item) => ({
              productId: item.productId ? item.productId.toString() : null,
              quantity: item.quantity,
            }))
          : [];
        ret.orderHistory = Array.isArray(ret.orderHistory)
          ? ret.orderHistory.map((id) => id.toString())
          : [];
        ret.fullName = ret.name;
        ret.email = ret.email || ret.username || null;
        ret.clientType = ret.clientType || null;
        ret.company = ret.company || { name: null, address: null, phone: null };
        ret.isEmailVerified = ret.isEmailVerified === undefined ? null : Boolean(ret.isEmailVerified);
        ret.profileImageUrl = ret.profileImageUrl || null;
        delete ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
