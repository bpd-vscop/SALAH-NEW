const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');

const ICON_WHITELIST = [
  'car',
  'truck',
  'package',
  'wrench',
  'key',
  'shield',
  'cpu',
  'battery',
  'shopping-bag',
  'shopping-cart',
  'sparkles',
];

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const menuItemSchema = z
  .object({
    categoryId: objectId,
    productId: objectId.optional().nullable(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

const menuSectionSchema = z
  .object({
    name: z.string().min(2).max(40),
    icon: z.enum(ICON_WHITELIST),
    order: z.number().int().min(0).optional(),
    items: z.array(menuItemSchema).max(12).optional(),
  })
  .strict();

const menuLinkSchema = z
  .object({
    label: z.string().min(2).max(32),
    href: z.string().min(1),
    order: z.number().int().min(0).optional(),
  })
  .strict();

const menuConfigSchema = z
  .object({
    sections: z.array(menuSectionSchema).max(10).default([]),
    links: z.array(menuLinkSchema).max(3).default([]),
  })
  .strict();

module.exports = {
  validateMenuConfig: (payload) => parseWithSchema(menuConfigSchema, payload),
  ICON_WHITELIST,
};
