const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const menuSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    items: {
      type: [menuItemSchema],
      default: [],
    },
  },
  { _id: true }
);

const menuLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      maxlength: 32,
      trim: true,
    },
    href: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const menuConfigSchema = new mongoose.Schema(
  {
    sections: {
      type: [menuSectionSchema],
      default: [],
    },
    links: {
      type: [menuLinkSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        ret.sections = Array.isArray(ret.sections)
          ? ret.sections.map((section) => ({
              id: section._id?.toString(),
              name: section.name,
              icon: section.icon,
              order: section.order,
              items: Array.isArray(section.items)
                ? section.items.map((item) => ({
                    id: item._id?.toString(),
                    categoryId: item.categoryId ? item.categoryId.toString() : null,
                    productId: item.productId ? item.productId.toString() : null,
                    order: item.order,
                  }))
                : [],
            }))
          : [];
        ret.links = Array.isArray(ret.links)
          ? ret.links.map((link) => ({
              id: link._id?.toString(),
              label: link.label,
              href: link.href,
              order: link.order,
            }))
          : [];
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('MenuConfig', menuConfigSchema);

