const mongoose = require('mongoose');

const orderProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
    tagsAtPurchase: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const orderCouponSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'] },
    amount: { type: Number, min: 0 },
    discountAmount: { type: Number, min: 0 },
    eligibleSubtotal: { type: Number, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: {
      type: [orderProductSchema],
      validate: [(products) => products.length > 0, 'Order must contain products'],
    },
    coupon: {
      type: orderCouponSchema,
      default: null,
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxCountry: {
      type: String,
      trim: true,
      default: null,
    },
    taxState: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    minimize: false,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();

        const rawUser = ret.userId;
        const hasUserDetails =
          rawUser &&
          typeof rawUser === 'object' &&
          (Object.prototype.hasOwnProperty.call(rawUser, 'name') ||
            Object.prototype.hasOwnProperty.call(rawUser, 'email') ||
            Object.prototype.hasOwnProperty.call(rawUser, 'clientType') ||
            Object.prototype.hasOwnProperty.call(rawUser, 'company'));

        if (hasUserDetails) {
          const resolvedUserId =
            typeof rawUser.id === 'string'
              ? rawUser.id
              : rawUser._id
                ? rawUser._id.toString()
                : null;

          const normalizeDate = (value) => {
            if (!value) return null;
            try {
              return new Date(value).toISOString();
            } catch (_err) {
              return null;
            }
          };

          ret.userId = resolvedUserId;
          ret.user = {
            id: resolvedUserId,
            name: rawUser.name || null,
            email: rawUser.email ?? null,
            phoneCode: rawUser.phoneCode ?? null,
            phoneNumber: rawUser.phoneNumber ?? null,
            clientType: rawUser.clientType ?? null,
            status: rawUser.status ?? null,
            isEmailVerified:
              typeof rawUser.isEmailVerified === 'boolean' ? rawUser.isEmailVerified : null,
            company: rawUser.company ?? null,
            billingAddress: rawUser.billingAddress
              ? {
                  fullName: rawUser.billingAddress.fullName || null,
                  phone: rawUser.billingAddress.phone || null,
                  addressLine1: rawUser.billingAddress.addressLine1 || null,
                  addressLine2: rawUser.billingAddress.addressLine2 || null,
                  city: rawUser.billingAddress.city || null,
                  state: rawUser.billingAddress.state || null,
                  postalCode: rawUser.billingAddress.postalCode || null,
                  country: rawUser.billingAddress.country || 'Morocco',
                }
              : null,
            taxExempt: typeof rawUser.taxExempt === 'boolean' ? rawUser.taxExempt : null,
            verificationFileUrl: rawUser.verificationFileUrl ?? null,
            verificationStatus: rawUser.verificationStatus ?? null,
            profileImage: rawUser.profileImage ?? null,
            shippingAddresses: Array.isArray(rawUser.shippingAddresses)
              ? rawUser.shippingAddresses.map((addr) => ({
                  id:
                    typeof addr?.id === 'string'
                      ? addr.id
                      : addr?._id
                        ? addr._id.toString()
                        : null,
                  fullName: addr?.fullName ?? null,
                  phone: addr?.phone ?? null,
                  addressLine1: addr?.addressLine1 ?? null,
                  addressLine2: addr?.addressLine2 ?? null,
                  city: addr?.city ?? null,
                  state: addr?.state ?? null,
                  postalCode: addr?.postalCode ?? null,
                  country: addr?.country ?? 'Morocco',
                  isDefault: addr?.isDefault || false,
                }))
              : [],
            accountCreated: normalizeDate(rawUser.accountCreated),
            accountUpdated: normalizeDate(rawUser.accountUpdated),
          };
        } else {
          ret.userId = ret.userId ? ret.userId.toString() : null;
        }

        ret.products = Array.isArray(ret.products)
          ? ret.products.map((item) => ({
              productId: item.productId ? item.productId.toString() : null,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              tagsAtPurchase: item.tagsAtPurchase,
            }))
          : [];
        ret.taxRate = typeof ret.taxRate === 'number' ? ret.taxRate : 0;
        ret.taxAmount = typeof ret.taxAmount === 'number' ? ret.taxAmount : 0;
        ret.taxCountry = ret.taxCountry || null;
        ret.taxState = ret.taxState || null;
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
