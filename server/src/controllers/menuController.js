const mongoose = require('mongoose');
const MenuConfig = require('../models/MenuConfig');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { validateMenuConfig, ICON_WHITELIST } = require('../validators/menu');
const { badRequest } = require('../utils/appError');

const ensureConfig = async () => {
  const existing = await MenuConfig.findOne();
  if (existing) {
    return existing;
  }
  return MenuConfig.create({ sections: [], links: [] });
};

const getMenu = async (_req, res, next) => {
  try {
    const config = await ensureConfig();
    const sectionCategoryIds = new Set();
    const sectionProductIds = new Set();

    config.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.categoryId) {
          sectionCategoryIds.add(String(item.categoryId));
        }
        if (item.productId) {
          sectionProductIds.add(String(item.productId));
        }
      });
    });

    const categories = await Category.find(
      { _id: { $in: Array.from(sectionCategoryIds) } },
      'name _id slug'
    ).lean();
    const products = await Product.find(
      { _id: { $in: Array.from(sectionProductIds) } },
      'name _id images'
    ).lean();

    const categoryMap = new Map(categories.map((cat) => [String(cat._id), cat]));
    const productMap = new Map(products.map((prod) => [String(prod._id), prod]));

    const payload = {
      links: config.links
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((link) => ({
          id: link.id,
          label: link.label,
          href: link.href,
          order: link.order,
        })),
      sections: config.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          id: section.id,
          name: section.name,
          icon: section.icon,
          order: section.order,
          items: section.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              id: item.id,
              categoryId: item.categoryId ? item.categoryId.toString() : null,
              productId: item.productId ? item.productId.toString() : null,
              order: item.order,
              category: item.categoryId ? categoryMap.get(String(item.categoryId)) || null : null,
              product: item.productId ? productMap.get(String(item.productId)) || null : null,
            })),
        })),
    };

    res.json({ menu: payload });
  } catch (error) {
    next(error);
  }
};

const updateMenu = async (req, res, next) => {
  try {
    const config = validateMenuConfig(req.body || {});

    if (config.links.length > 3) {
      throw badRequest('A maximum of 3 links is supported');
    }

    const categoryIds = new Set();
    const productIds = new Set();

    config.sections.forEach((section) => {
      section.items?.forEach((item) => {
        if (item.categoryId) {
          categoryIds.add(item.categoryId);
        }
        if (item.productId) {
          productIds.add(item.productId);
        }
      });
      if (!ICON_WHITELIST.includes(section.icon)) {
        throw badRequest(`Unsupported icon "${section.icon}"`);
      }
    });

    if (categoryIds.size) {
      const foundCategories = await Category.countDocuments({
        _id: { $in: Array.from(categoryIds, (id) => new mongoose.Types.ObjectId(id)) },
      });
      if (foundCategories !== categoryIds.size) {
        throw badRequest('One or more categories do not exist');
      }
    }

    if (productIds.size) {
      const foundProducts = await Product.countDocuments({
        _id: { $in: Array.from(productIds, (id) => new mongoose.Types.ObjectId(id)) },
      });
      if (foundProducts !== productIds.size) {
        throw badRequest('One or more products do not exist');
      }
    }

    const menuConfig = await ensureConfig();
    menuConfig.sections = config.sections.map((section, idx) => ({
      name: section.name,
      icon: section.icon,
      order: typeof section.order === 'number' ? section.order : idx,
      items: (section.items || []).map((item, itemIdx) => ({
        categoryId: item.categoryId,
        productId: item.productId || null,
        order: typeof item.order === 'number' ? item.order : itemIdx,
      })),
    }));
    menuConfig.links = config.links.map((link, index) => ({
      label: link.label,
      href: link.href,
      order: typeof link.order === 'number' ? link.order : index,
    }));

    await menuConfig.save();
    req.body = undefined; // ensure no accidental reuse
    return getMenu(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenu,
  updateMenu,
  ICON_WHITELIST,
};
