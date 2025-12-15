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
    id: objectId.optional(),
    categoryId: objectId,
    productId: objectId.optional().nullable(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

const menuSectionSchema = z
  .object({
    id: objectId.optional(),
    name: z.string().min(2).max(40),
    icon: z.enum(ICON_WHITELIST),
    order: z.number().int().min(0).optional(),
    items: z.array(menuItemSchema).max(18).optional(),
    visible: z.boolean().optional(),
  })
  .strict();

const menuLinkSchema = z
  .object({
    id: objectId.optional(),
    label: z.string().min(2).max(32),
    href: z.string().min(1),
    order: z.number().int().min(0).optional(),
    visible: z.boolean().optional(),
  })
  .strict();

const promoSchema = z
  .object({
    text: z.string().max(100).optional(),
    visible: z.boolean().optional(),
  })
  .strict();

const menuConfigSchema = z
  .object({
    sections: z.array(menuSectionSchema).max(10).default([]),
    links: z.array(menuLinkSchema).max(6).default([]),
    promo: promoSchema.optional(),
  })
  .strict();

module.exports = {
  validateMenuConfig: (payload) => parseWithSchema(menuConfigSchema, payload),
  ICON_WHITELIST,
};
