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
    // ShipEngine rate info
    shippingRate: z.object({
      rateId: z.string(),
      carrierId: z.string().optional(),
      carrierCode: z.string().optional(),
      carrierName: z.string(),
      serviceCode: z.string().optional(),
      serviceName: z.string(),
      price: z.number(),
      currency: z.string().optional(),
      deliveryDays: z.number().optional().nullable(),
      estimatedDelivery: z.string().optional().nullable(),
    }).optional(),
    // Payment info
    paymentMethod: z.enum(['paypal', 'none']).optional().default('none'),
    paymentId: z.string().optional(),
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

