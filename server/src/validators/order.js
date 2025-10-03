const { z } = require('zod');
const { parseWithSchema } = require('./index');

const orderItemSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().int().min(1),
  })
  .strict();

const createOrderSchema = z
  .object({
    products: z.array(orderItemSchema).min(1),
  })
  .strict();

const updateOrderSchema = z
  .object({
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  })
  .strict();

module.exports = {
  validateCreateOrder: (payload) => parseWithSchema(createOrderSchema, payload),
  validateUpdateOrder: (payload) => parseWithSchema(updateOrderSchema, payload),
};
