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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
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
    company: {
      type: companyInfoSchema,
      default: undefined,
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
        delete ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        ret.email = ret.email || null;
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
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
