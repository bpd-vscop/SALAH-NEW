const { z } = require('zod');
const { parseWithSchema } = require('./index');

const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9-_]+$/, 'Coupon codes may only contain letters, numbers, hyphens, and underscores')
  .transform((value) => value.toUpperCase());

const orderItemSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().int().min(1),
  })
  .strict();

const createOrderSchema = z
  .object({
    products: z.array(orderItemSchema).min(1),
    couponCode: couponCodeSchema.optional(),
    shippingMethod: z.enum(['standard', 'express', 'overnight']).optional().default('standard'),
    shippingAddressId: z.string().optional(),
  })
  .strict();

const updateOrderSchema = z
  .object({
    status: z.enum(['pending', 'processing', 'shipped', 'completed', 'cancelled']),
  })
  .strict();

module.exports = {
  validateCreateOrder: (payload) => parseWithSchema(createOrderSchema, payload),
  validateUpdateOrder: (payload) => parseWithSchema(updateOrderSchema, payload),
};

