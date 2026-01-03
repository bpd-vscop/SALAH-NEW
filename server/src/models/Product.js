const mongoose = require('mongoose');

const allowedTags = ['coming soon'];
const productTypes = ['simple', 'variable', 'grouped'];
const productStatuses = ['draft', 'scheduled', 'private', 'published'];
const inventoryStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'backorder', 'preorder'];
const visibilityOptions = ['catalog', 'search', 'hidden', 'catalog-and-search'];

const specificationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const compatibilitySchema = new mongoose.Schema(
  {
    yearStart: { type: Number, min: 1900, max: 2100 },
    yearEnd: { type: Number, min: 1900, max: 2100 },
    year: { type: Number, min: 1900, max: 2100 },
    make: { type: String, trim: true, required: true },
    model: { type: String, trim: true, required: true },
    subModel: { type: String, trim: true },
    engine: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    name: { type: String, trim: true },
    attributes: {
      type: Map,
      of: String,
      default: undefined,
    },
    price: { type: Number, min: 0 },
    salePrice: { type: Number, min: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    allowBackorder: { type: Boolean, default: false },
    image: { type: String, trim: true },
    weight: { type: Number, min: 0 },
  },
  { _id: true, timestamps: false }
);

const serialNumberSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ['available', 'sold', 'reserved', 'defective', 'returned'],
      default: 'available'
    },
    soldDate: { type: Date },
    orderId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    productCode: {
      type: String,
      trim: true,
    },
    productType: {
      type: String,
      enum: productTypes,
      default: 'simple',
    },
    status: {
      type: String,
      enum: productStatuses,
      default: 'published',
    },
    visibility: {
      type: String,
      enum: visibilityOptions,
      default: 'catalog-and-search',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    categoryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manufacturer',
      default: null,
    },
    manufacturerName: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      enum: allowedTags,
      default: [],
      validate: {
        validator: (tags) => new Set(tags).size === tags.length,
        message: 'Tags must be unique per product',
      },
    },
    shortDescription: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    featureHighlights: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    videoUrls: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    cost: {
      type: Number,
      min: 0,
      default: null,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    saleStartDate: {
      type: Date,
    },
    saleEndDate: {
      type: Date,
    },
    taxClass: {
      type: String,
      trim: true,
    },
    manageStock: {
      type: Boolean,
      default: true,
    },
    inventory: {
      quantity: { type: Number, min: 0, default: 0 },
      lowStockThreshold: { type: Number, min: 0, default: 0 },
      status: { type: String, enum: inventoryStatuses, default: 'in_stock' },
      allowBackorder: { type: Boolean, default: false },
      leadTime: { type: String, trim: true },
    },
    restockedAt: {
      type: Date,
      default: null,
    },
    shipping: {
      weight: { type: Number, min: 0 },
      weightUnit: { type: String, trim: true, default: 'lb' },
      dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        unit: { type: String, trim: true, default: 'in' },
      },
      shippingClass: { type: String, trim: true },
      hazardous: { type: Boolean, default: false },
      warehouseLocation: { type: String, trim: true },
    },
    packageContents: {
      type: [String],
      default: [],
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    attributes: {
      type: Map,
      of: String,
      default: undefined,
    },
    customAttributes: {
      type: Map,
      of: String,
      default: undefined,
    },
    variationAttributes: {
      type: [String],
      default: [],
    },
    variations: {
      type: [variationSchema],
      default: undefined,
    },
    serialNumbers: {
      type: [serialNumberSchema],
      default: [],
    },
    documents: {
      type: [documentSchema],
      default: [],
    },
    compatibility: {
      type: [compatibilitySchema],
      default: [],
    },
    relatedProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    upsellProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    crossSellProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    seo: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true },
      canonicalUrl: { type: String, trim: true },
      openGraphImage: { type: String, trim: true },
    },
    badges: [
      {
        label: { type: String, trim: true },
        description: { type: String, trim: true },
        icon: { type: String, trim: true },
      },
    ],
    support: {
      warranty: { type: String, trim: true },
      returnPolicy: { type: String, trim: true },
      supportPhone: { type: String, trim: true },
      supportEmail: { type: String, trim: true },
      liveChatUrl: { type: String, trim: true },
      supportHours: { type: String, trim: true },
    },
    reviewsSummary: {
      averageRating: { type: Number, min: 0, max: 5, default: 0 },
      reviewCount: { type: Number, min: 0, default: 0 },
      ratingBreakdown: {
        type: Map,
        of: Number,
        default: undefined,
      },
    },
    notes: {
      sales: { type: String, trim: true },
      internal: { type: String, trim: true },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
    requiresB2B: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
        const normalizedCategoryIds = Array.isArray(ret.categoryIds)
          ? ret.categoryIds.map((categoryId) => (categoryId ? categoryId.toString() : null)).filter(Boolean)
          : [];
        if (ret.categoryId && !normalizedCategoryIds.includes(ret.categoryId)) {
          normalizedCategoryIds.unshift(ret.categoryId);
        }
        ret.categoryIds = normalizedCategoryIds;
        ret.manufacturerId = ret.manufacturerId ? ret.manufacturerId.toString() : null;
        if (Array.isArray(ret.relatedProductIds)) {
          ret.relatedProductIds = ret.relatedProductIds
            .map((item) => (item ? item.toString() : null))
            .filter(Boolean);
        }
        if (Array.isArray(ret.upsellProductIds)) {
          ret.upsellProductIds = ret.upsellProductIds
            .map((item) => (item ? item.toString() : null))
            .filter(Boolean);
        }
        if (Array.isArray(ret.crossSellProductIds)) {
          ret.crossSellProductIds = ret.crossSellProductIds
            .map((item) => (item ? item.toString() : null))
            .filter(Boolean);
        }
        if (Array.isArray(ret.variations)) {
          ret.variations = ret.variations.map((variation) => {
            const plain = variation.toObject ? variation.toObject() : variation;
            plain.id = plain._id ? plain._id.toString() : undefined;
            delete plain._id;
            return plain;
          });
        }
        if (Array.isArray(ret.serialNumbers)) {
          ret.serialNumbers = ret.serialNumbers.map((serial) => {
            const plain = serial.toObject ? serial.toObject() : serial;
            plain.id = plain._id ? plain._id.toString() : undefined;
            delete plain._id;
            return plain;
          });
        }
        ret.restockedAt = ret.restockedAt ? new Date(ret.restockedAt).toISOString() : null;
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.statics.allowedTags = allowedTags;
productSchema.statics.productTypes = productTypes;
productSchema.statics.productStatuses = productStatuses;
productSchema.statics.inventoryStatuses = inventoryStatuses;
productSchema.statics.visibilityOptions = visibilityOptions;

module.exports = mongoose.model('Product', productSchema);
